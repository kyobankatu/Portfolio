import Matter from 'matter-js'

const BASE_DELTA = 1000 / 60
const MAX_VELOCITY = 25
const DRAG_THRESHOLD = 6
const ALL_COLLISIONS = 0xFFFFFFFF

function getDocumentPoint(event) {
    return {
        x: event.clientX + window.scrollX,
        y: event.clientY + window.scrollY,
    }
}

function makeBoundaries(width, height) {
    const thickness = 120
    return [
        Matter.Bodies.rectangle(width / 2, -thickness / 2, width * 2, thickness, { isStatic: true, label: 'ceiling' }),
        Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, { isStatic: true, label: 'left-wall' }),
        Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, { isStatic: true, label: 'right-wall' }),
        Matter.Bodies.rectangle(width / 2, height + thickness / 2, width * 2, thickness, { isStatic: true, label: 'floor' }),
    ]
}

function getElementCenter(element) {
    const rect = element.getBoundingClientRect()
    return {
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.top + window.scrollY + rect.height / 2,
        width: rect.width,
        height: rect.height,
    }
}

function createEntry(element, kind, sectionEntry = null) {
    const rect = getElementCenter(element)
    const size = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) }
    const body = Matter.Bodies.rectangle(rect.x, rect.y, size.width, size.height, {
        restitution: 0.2,
        friction: 0.7,
        frictionAir: 0.015,
        inertia: Infinity,
        label: element.id || element.dataset.physicsObject || `physics-${kind}`,
    })

    return {
        element,
        kind,
        sectionEntry,
        body,
        initialPosition: { x: body.position.x, y: body.position.y },
        renderOrigin: { x: body.position.x, y: body.position.y },
        size,
        initialAngle: body.angle,
        initialTranslate: element.style.translate,
        initialZIndex: element.style.zIndex,
        initialTouchAction: element.style.touchAction,
        enabled: kind === 'section',
        drag: null,
    }
}

export function resolvePhysicsTarget(section, target) {
    if (!(section instanceof HTMLElement)) {
        throw new TypeError('Physics Toss section must be an HTML element.')
    }
    if (!(target instanceof Element)) {
        return section
    }
    const object = target.closest('[data-physics-object]')
    return object && section.contains(object) ? object : section
}

export function createPhysicsTossController({
    targets,
    bounds,
    getBounds = () => bounds,
    instructionsId,
    matchMedia = window.matchMedia?.bind(window) ?? (() => ({ matches: false })),
    requestFrame = window.requestAnimationFrame.bind(window),
    cancelFrame = window.cancelAnimationFrame.bind(window),
}) {
    if (!Array.isArray(targets) || targets.some((target) => !(target instanceof HTMLElement))) {
        throw new TypeError('Physics Toss targets must be an array of HTML elements.')
    }
    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
        throw new RangeError('Physics Toss bounds must have positive finite width and height.')
    }

    const sectionEntries = targets.map((element) => createEntry(element, 'section'))
    const objectEntries = sectionEntries.flatMap((sectionEntry) => (
        [...sectionEntry.element.querySelectorAll('[data-physics-object]')]
            .map((element) => createEntry(element, 'object', sectionEntry))
    ))
    const entries = [...sectionEntries, ...objectEntries]
    const entriesByElement = new Map(entries.map((entry) => [entry.element, entry]))
    entries.forEach((entry) => {
        entry.initialTabIndex = entry.element.getAttribute('tabindex')
        entry.initialDescription = entry.element.getAttribute('aria-describedby')
    })

    let engine = null
    let worldBounds = { ...bounds }
    let boundaryBodies = []
    let frameId = null
    let boundsFrameId = null
    let previousTime = null
    let pendingDrag = null
    let activeEntry = null
    let keyboardEntry = null
    let suppressedClick = null
    let prefersReducedMotion = false
    let motionQuery = null
    let destroyed = false

    function setCollisionEnabled(entry, enabled) {
        entry.enabled = enabled
        entry.body.collisionFilter.mask = enabled ? ALL_COLLISIONS : 0
        Matter.Sleeping.set(entry.body, true)
    }

    function syncEntryToElement(entry) {
        const center = getElementCenter(entry.element)
        const offset = {
            x: entry.body.position.x - entry.renderOrigin.x,
            y: entry.body.position.y - entry.renderOrigin.y,
        }
        entry.renderOrigin = { x: center.x - offset.x, y: center.y - offset.y }
        Matter.Body.setPosition(entry.body, center)
        Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
        Matter.Body.setAngle(entry.body, 0)
        Matter.Body.setAngularVelocity(entry.body, 0)
    }

    function refreshLayout() {
        if (!engine) {
            return
        }
        const currentOffsets = new Map(entries.map((entry) => [entry, {
            x: entry.body.position.x - entry.renderOrigin.x,
            y: entry.body.position.y - entry.renderOrigin.y,
        }]))
        const currentTranslations = new Map(entries.map((entry) => [entry, entry.element.style.translate]))
        entries.forEach((entry) => { entry.element.style.translate = entry.initialTranslate })
        const measurements = new Map(entries.map((entry) => [entry, getElementCenter(entry.element)]))
        entries.forEach((entry) => { entry.element.style.translate = currentTranslations.get(entry) })
        const renderedMeasurements = new Map(entries.map((entry) => [entry, getElementCenter(entry.element)]))

        entries.forEach((entry) => {
            const measurement = measurements.get(entry)
            const width = Math.max(1, measurement.width)
            const height = Math.max(1, measurement.height)
            if (width !== entry.size.width || height !== entry.size.height) {
                Matter.Body.scale(entry.body, width / entry.size.width, height / entry.size.height)
                entry.size = { width, height }
            }
            const position = { x: measurement.x, y: measurement.y }
            const offset = currentOffsets.get(entry)
            const renderedPosition = renderedMeasurements.get(entry)
            entry.renderOrigin = { x: renderedPosition.x - offset.x, y: renderedPosition.y - offset.y }
            entry.initialPosition = { ...position }
            Matter.Body.setPosition(entry.body, renderedPosition)
        })
        entries.forEach(constrainEntry)
        entries.forEach(render)
    }

    function clampPosition(entry, x, y) {
        const halfWidth = (entry.body.bounds.max.x - entry.body.bounds.min.x) / 2
        const halfHeight = (entry.body.bounds.max.y - entry.body.bounds.min.y) / 2
        const minX = halfWidth
        const maxX = Math.max(minX, worldBounds.width - halfWidth)
        const minY = halfHeight
        const maxY = Math.max(minY, worldBounds.height - halfHeight)
        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y)),
        }
    }

    function activateSectionMode(sectionEntry) {
        objectEntries
            .filter((entry) => entry.sectionEntry === sectionEntry)
            .forEach((entry) => setCollisionEnabled(entry, false))
        syncEntryToElement(sectionEntry)
        setCollisionEnabled(sectionEntry, true)
    }

    function activateObjectMode(sectionEntry) {
        setCollisionEnabled(sectionEntry, false)
        objectEntries
            .filter((entry) => entry.sectionEntry === sectionEntry)
            .forEach((entry) => {
                syncEntryToElement(entry)
                setCollisionEnabled(entry, true)
            })
    }

    function render(entry) {
        if (!entry.enabled || !entry.element.isConnected) {
            return
        }
        const deltaX = entry.body.position.x - entry.renderOrigin.x
        const deltaY = entry.body.position.y - entry.renderOrigin.y
        if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) {
            entry.element.style.translate = entry.initialTranslate
            return
        }
        entry.element.style.translate = `${deltaX}px ${deltaY}px`
    }

    function constrainEntry(entry) {
        if (!entry.enabled || entry.body.isStatic) {
            return
        }
        const currentX = entry.body.position.x
        const currentY = entry.body.position.y
        const { x, y } = clampPosition(entry, currentX, currentY)
        if (x === currentX && y === currentY) {
            return
        }
        Matter.Body.setPosition(entry.body, { x, y })
        Matter.Body.setVelocity(entry.body, {
            x: x === currentX ? entry.body.velocity.x : 0,
            y: y === currentY ? entry.body.velocity.y : 0,
        })
    }

    function updateDirectManipulation() {
        Matter.Engine.update(engine, BASE_DELTA)
        entries.forEach(constrainEntry)
        entries.forEach((entry) => {
            if (entry !== activeEntry && entry !== keyboardEntry && !entry.body.isStatic) {
                Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
                Matter.Sleeping.set(entry.body, true)
            }
            render(entry)
        })
    }

    function animate(timestamp) {
        if (!engine) {
            return
        }
        const delta = previousTime === null ? BASE_DELTA : Math.min(Math.max(timestamp - previousTime, 1), BASE_DELTA)
        previousTime = timestamp
        Matter.Engine.update(engine, delta)
        entries.forEach(constrainEntry)
        entries.forEach(render)
        frameId = prefersReducedMotion ? null : requestFrame(animate)
    }

    function scheduleAnimation() {
        if (engine && !prefersReducedMotion && frameId === null) {
            frameId = requestFrame(animate)
        }
    }

    function scheduleBoundsUpdate() {
        if (!engine || boundsFrameId !== null) {
            return
        }
        boundsFrameId = requestFrame(() => {
            boundsFrameId = null
            updateBounds()
        })
    }

    function updateBounds() {
        if (!engine) {
            return
        }
        const nextBounds = getBounds()
        if (!nextBounds || !Number.isFinite(nextBounds.width) || !Number.isFinite(nextBounds.height) || nextBounds.width <= 0 || nextBounds.height <= 0) {
            return
        }
        if (nextBounds.width !== worldBounds.width || nextBounds.height !== worldBounds.height) {
            worldBounds = { width: nextBounds.width, height: nextBounds.height }
            boundaryBodies.forEach((body) => Matter.Composite.remove(engine.world, body))
            boundaryBodies = makeBoundaries(worldBounds.width, worldBounds.height)
            Matter.Composite.add(engine.world, boundaryBodies)
        }
        refreshLayout()
    }

    function handleMotionPreference(event) {
        prefersReducedMotion = event.matches
        if (prefersReducedMotion) {
            if (frameId !== null) {
                cancelFrame(frameId)
            }
            frameId = null
            previousTime = null
            entries.forEach((entry) => {
                if (entry.body.isStatic) {
                    return
                }
                Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
                Matter.Body.setAngularVelocity(entry.body, 0)
                Matter.Sleeping.set(entry.body, true)
            })
            return
        }
        scheduleAnimation()
    }

    function beginDrag(entry, point, timeStamp) {
        Matter.Sleeping.set(entry.body, false)
        Matter.Body.setStatic(entry.body, true)
        entry.drag = {
            offsetX: point.x - entry.body.position.x,
            offsetY: point.y - entry.body.position.y,
            lastTime: timeStamp,
            velocity: { x: 0, y: 0 },
        }
        activeEntry = entry
        entry.element.style.zIndex = '10'
    }

    function moveDraggedEntry(event, point) {
        const entry = activeEntry
        if (!entry) {
            return
        }
        const position = clampPosition(entry, point.x - entry.drag.offsetX, point.y - entry.drag.offsetY)
        const elapsed = Math.max(event.timeStamp - entry.drag.lastTime, 1)
        entry.drag.velocity = {
            x: Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, (position.x - entry.body.position.x) * BASE_DELTA / elapsed)),
            y: Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, (position.y - entry.body.position.y) * BASE_DELTA / elapsed)),
        }
        Matter.Body.setPosition(entry.body, position)
        entry.drag.lastTime = event.timeStamp
        if (prefersReducedMotion) {
            updateDirectManipulation()
        } else {
            render(entry)
        }
    }

    function handlePointerDown(event) {
        if (event.button !== 0 || activeEntry || pendingDrag) {
            return
        }
        const sectionEntry = entriesByElement.get(event.currentTarget)
        if (!sectionEntry || !engine) {
            return
        }
        const element = resolvePhysicsTarget(sectionEntry.element, event.target)
        const entry = entriesByElement.get(element) || sectionEntry
        const interactive = event.target instanceof Element && Boolean(event.target.closest('a, button, input, select, textarea, [contenteditable="true"]'))
        if (interactive && entry === sectionEntry) {
            return
        }
        pendingDrag = {
            entry,
            sectionEntry,
            point: getDocumentPoint(event),
            startX: event.clientX,
            startY: event.clientY,
            timeStamp: event.timeStamp,
            pointerType: event.pointerType,
            interactive,
        }
        if (!pendingDrag.interactive && event.pointerType !== 'touch') {
            event.preventDefault()
        }
    }

    function handlePointerMove(event) {
        const point = getDocumentPoint(event)
        if (!activeEntry && pendingDrag) {
            const deltaX = event.clientX - pendingDrag.startX
            const deltaY = event.clientY - pendingDrag.startY
            const distance = Math.hypot(deltaX, deltaY)
            if (distance < DRAG_THRESHOLD) {
                return
            }
            if (pendingDrag.pointerType === 'touch' && Math.abs(deltaY) > Math.abs(deltaX)) {
                pendingDrag = null
                return
            }
            const pending = pendingDrag
            pendingDrag = null
            if (pending.entry.kind === 'object') {
                activateObjectMode(pending.sectionEntry)
            } else {
                activateSectionMode(pending.sectionEntry)
            }
            beginDrag(pending.entry, pending.point, pending.timeStamp)
            if (pending.interactive) {
                suppressedClick = { element: pending.entry.element, timeStamp: event.timeStamp }
            }
        }
        if (!activeEntry) {
            return
        }
        moveDraggedEntry(event, point)
        event.preventDefault()
    }

    function finishDrag(event, cancelled = false) {
        if (pendingDrag) {
            pendingDrag = null
            return
        }
        if (!activeEntry) {
            return
        }
        const entry = activeEntry
        activeEntry = null
        const shouldSleep = cancelled || prefersReducedMotion
        const velocity = shouldSleep ? { x: 0, y: 0 } : entry.drag.velocity
        entry.drag = null
        Matter.Body.setStatic(entry.body, false)
        Matter.Body.setVelocity(entry.body, velocity)
        Matter.Sleeping.set(entry.body, shouldSleep)
        entry.element.style.zIndex = entry.initialZIndex
        scheduleAnimation()
    }

    function getOwnerSection(entry) {
        return entry.kind === 'section' ? entry : entry.sectionEntry
    }

    function releaseKeyboardEntry() {
        if (!keyboardEntry) {
            return
        }
        const entry = keyboardEntry
        keyboardEntry = null
        Matter.Body.setStatic(entry.body, false)
        Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
        Matter.Sleeping.set(entry.body, prefersReducedMotion)
        entry.element.style.zIndex = entry.initialZIndex
        scheduleAnimation()
    }

    function handleKeyDown(event) {
        const sectionEntry = entriesByElement.get(event.currentTarget)
        if (!sectionEntry || !engine) {
            return
        }
        if (event.target instanceof Element && event.target.closest('a[href], button, input, select, textarea, [contenteditable="true"], [role="button"]')) {
            return
        }
        if (event.code === 'Space' || event.key === ' ') {
            event.preventDefault()
            if (event.repeat) {
                return
            }
            if (keyboardEntry) {
                if (getOwnerSection(keyboardEntry) === sectionEntry) {
                    releaseKeyboardEntry()
                }
                return
            }
            if (activeEntry || pendingDrag) {
                return
            }
            const element = resolvePhysicsTarget(sectionEntry.element, event.target)
            const entry = entriesByElement.get(element) || sectionEntry
            if (entry.kind === 'object') {
                activateObjectMode(sectionEntry)
            } else {
                activateSectionMode(sectionEntry)
            }
            Matter.Sleeping.set(entry.body, false)
            Matter.Body.setStatic(entry.body, true)
            keyboardEntry = entry
            entry.element.style.zIndex = '10'
            return
        }
        if (!keyboardEntry || getOwnerSection(keyboardEntry) !== sectionEntry) {
            return
        }
        const movement = {
            ArrowLeft: { x: -16, y: 0 },
            ArrowRight: { x: 16, y: 0 },
            ArrowUp: { x: 0, y: -16 },
            ArrowDown: { x: 0, y: 16 },
        }[event.key]
        if (!movement) {
            return
        }
        event.preventDefault()
        const { x, y } = clampPosition(
            keyboardEntry,
            keyboardEntry.body.position.x + movement.x,
            keyboardEntry.body.position.y + movement.y,
        )
        Matter.Body.setPosition(keyboardEntry.body, { x, y })
        if (prefersReducedMotion) {
            updateDirectManipulation()
        } else {
            render(keyboardEntry)
        }
    }

    function handleClick(event) {
        if (!suppressedClick) {
            return
        }
        const suppression = suppressedClick
        suppressedClick = null
        if (event.timeStamp - suppression.timeStamp > 250) {
            return
        }
        if (!(event.target instanceof Element) || !suppression.element.contains(event.target)) {
            return
        }
        event.preventDefault()
        event.stopImmediatePropagation()
    }

    function reset() {
        pendingDrag = null
        activeEntry = null
        keyboardEntry = null
        sectionEntries.forEach((entry) => {
            entry.element.style.translate = entry.initialTranslate
            entry.element.style.zIndex = entry.initialZIndex
            Matter.Body.setStatic(entry.body, false)
            syncEntryToElement(entry)
            Matter.Body.setPosition(entry.body, entry.initialPosition)
        })
        objectEntries.forEach((entry) => {
            entry.element.style.translate = entry.initialTranslate
            entry.element.style.zIndex = entry.initialZIndex
            Matter.Body.setStatic(entry.body, false)
            Matter.Body.setPosition(entry.body, entry.initialPosition)
            Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
            Matter.Body.setAngle(entry.body, entry.initialAngle)
            Matter.Body.setAngularVelocity(entry.body, 0)
            entry.renderOrigin = { ...entry.initialPosition }
            setCollisionEnabled(entry, false)
        })
        sectionEntries.forEach((entry) => {
            Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
            Matter.Body.setAngle(entry.body, entry.initialAngle)
            Matter.Body.setAngularVelocity(entry.body, 0)
            setCollisionEnabled(entry, true)
            entry.renderOrigin = { ...entry.initialPosition }
        })
    }

    function stop() {
        if (engine) {
            reset()
        }
        if (frameId !== null) {
            cancelFrame(frameId)
        }
        if (boundsFrameId !== null) {
            cancelFrame(boundsFrameId)
        }
        frameId = null
        boundsFrameId = null
        previousTime = null
        if (motionQuery?.removeEventListener) {
            motionQuery.removeEventListener('change', handleMotionPreference)
        } else {
            motionQuery?.removeListener?.(handleMotionPreference)
        }
        document.removeEventListener('click', handleClick, true)
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', finishDrag)
        window.removeEventListener('pointercancel', handlePointerCancel)
        window.removeEventListener('resize', updateBounds)
        window.removeEventListener('scroll', scheduleBoundsUpdate)
        sectionEntries.forEach((entry) => {
            entry.element.removeEventListener('pointerdown', handlePointerDown)
            entry.element.removeEventListener('keydown', handleKeyDown)
        })
        entries.forEach((entry) => {
            entry.element.style.translate = entry.initialTranslate
            entry.element.style.zIndex = entry.initialZIndex
            entry.element.style.touchAction = entry.initialTouchAction
            if (entry.initialTabIndex === null) {
                entry.element.removeAttribute('tabindex')
            } else {
                entry.element.setAttribute('tabindex', entry.initialTabIndex)
            }
            if (entry.initialDescription === null) {
                entry.element.removeAttribute('aria-describedby')
            } else {
                entry.element.setAttribute('aria-describedby', entry.initialDescription)
            }
            entry.drag = null
        })
        boundaryBodies = []
        if (engine) {
            Matter.Engine.clear(engine)
        }
        engine = null
    }

    function handlePointerCancel(event) {
        finishDrag(event, true)
    }

    return {
        start() {
            if (destroyed) {
                throw new Error('Physics Toss controller has been destroyed.')
            }
            if (engine) {
                return
            }
            const world = Matter.Engine.create({ enableSleeping: true })
            world.gravity.y = 1
            world.gravity.scale = 0.001
            engine = world
            worldBounds = { ...bounds }
            boundaryBodies = makeBoundaries(worldBounds.width, worldBounds.height)
            motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
            prefersReducedMotion = Boolean(motionQuery.matches)
            if (motionQuery.addEventListener) {
                motionQuery.addEventListener('change', handleMotionPreference)
            } else {
                motionQuery.addListener?.(handleMotionPreference)
            }
            Matter.Composite.add(engine.world, [
                ...entries.map((entry) => entry.body),
                ...boundaryBodies,
            ])
            entries.forEach((entry) => {
                if (!entry.enabled) {
                    entry.body.collisionFilter.mask = 0
                }
                Matter.Sleeping.set(entry.body, true)
                entry.element.style.touchAction = 'pan-y'
                entry.element.tabIndex = 0
                if (instructionsId) {
                    const descriptions = (entry.initialDescription ?? '').split(/\s+/).filter(Boolean)
                    if (!descriptions.includes(instructionsId)) {
                        descriptions.push(instructionsId)
                    }
                    entry.element.setAttribute('aria-describedby', descriptions.join(' '))
                }
            })
            sectionEntries.forEach((entry) => {
                entry.element.addEventListener('pointerdown', handlePointerDown)
                entry.element.addEventListener('keydown', handleKeyDown)
            })
            document.addEventListener('click', handleClick, true)
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', finishDrag)
            window.addEventListener('pointercancel', handlePointerCancel)
            window.addEventListener('resize', updateBounds)
            window.addEventListener('scroll', scheduleBoundsUpdate, { passive: true })
            scheduleAnimation()
        },
        stop() {
            stop()
        },
        reset() {
            if (engine) {
                reset()
            }
        },
        refreshLayout() {
            refreshLayout()
        },
        destroy() {
            stop()
            destroyed = true
        },
    }
}
