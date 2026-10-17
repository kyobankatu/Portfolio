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
    const body = Matter.Bodies.rectangle(rect.x, rect.y, rect.width, rect.height, {
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
        initialAngle: body.angle,
        initialTranslate: element.style.translate,
        initialZIndex: element.style.zIndex,
        initialTouchAction: element.style.touchAction,
        enabled: kind === 'section',
        drag: null,
    }
}

export function resolvePhysicsTarget(section, target) {
    if (!(section instanceof HTMLElement)) throw new TypeError('Physics Toss section must be an HTML element.')
    if (!(target instanceof Element)) return section
    const object = target.closest('[data-physics-object]')
    return object && section.contains(object) ? object : section
}

export function createPhysicsTossController({
    targets,
    bounds,
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

    let engine = null
    let frameId = null
    let previousTime = null
    let pendingDrag = null
    let activeEntry = null
    let suppressNextClick = false
    let destroyed = false

    function setCollisionEnabled(entry, enabled) {
        entry.enabled = enabled
        entry.body.collisionFilter.mask = enabled ? ALL_COLLISIONS : 0
        Matter.Sleeping.set(entry.body, true)
    }

    function syncEntryToElement(entry) {
        const center = getElementCenter(entry.element)
        entry.renderOrigin = { x: center.x, y: center.y }
        Matter.Body.setPosition(entry.body, entry.renderOrigin)
        Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
        Matter.Body.setAngle(entry.body, 0)
        Matter.Body.setAngularVelocity(entry.body, 0)
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
        if (!entry.enabled || !entry.element.isConnected) return
        const deltaX = entry.body.position.x - entry.renderOrigin.x
        const deltaY = entry.body.position.y - entry.renderOrigin.y
        if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) {
            entry.element.style.translate = entry.initialTranslate
            return
        }
        entry.element.style.translate = `${deltaX}px ${deltaY}px`
    }

    function constrainEntry(entry) {
        if (!entry.enabled || entry.body.isStatic) return
        const halfWidth = (entry.body.bounds.max.x - entry.body.bounds.min.x) / 2
        const halfHeight = (entry.body.bounds.max.y - entry.body.bounds.min.y) / 2
        const minX = halfWidth
        const maxX = Math.max(minX, bounds.width - halfWidth)
        const minY = halfHeight
        const maxY = Math.max(minY, bounds.height - halfHeight)
        const currentX = entry.body.position.x
        const currentY = entry.body.position.y
        const x = Math.max(minX, Math.min(maxX, currentX))
        const y = Math.max(minY, Math.min(maxY, currentY))
        if (x === currentX && y === currentY) return
        Matter.Body.setPosition(entry.body, { x, y })
        Matter.Body.setVelocity(entry.body, {
            x: x === currentX ? entry.body.velocity.x : 0,
            y: y === currentY ? entry.body.velocity.y : 0,
        })
    }

    function animate(timestamp) {
        if (!engine) return
        const delta = previousTime === null ? BASE_DELTA : Math.min(Math.max(timestamp - previousTime, 1), BASE_DELTA)
        previousTime = timestamp
        Matter.Engine.update(engine, delta)
        entries.forEach(constrainEntry)
        entries.forEach(render)
        frameId = requestFrame(animate)
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
        if (!entry) return
        const halfWidth = (entry.body.bounds.max.x - entry.body.bounds.min.x) / 2
        const halfHeight = (entry.body.bounds.max.y - entry.body.bounds.min.y) / 2
        const position = {
            x: Math.max(halfWidth, Math.min(bounds.width - halfWidth, point.x - entry.drag.offsetX)),
            y: Math.max(halfHeight, Math.min(bounds.height - halfHeight, point.y - entry.drag.offsetY)),
        }
        const elapsed = Math.max(event.timeStamp - entry.drag.lastTime, 1)
        entry.drag.velocity = {
            x: Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, (position.x - entry.body.position.x) * BASE_DELTA / elapsed)),
            y: Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, (position.y - entry.body.position.y) * BASE_DELTA / elapsed)),
        }
        Matter.Body.setPosition(entry.body, position)
        entry.drag.lastTime = event.timeStamp
    }

    function handlePointerDown(event) {
        if (event.button !== 0 || activeEntry || pendingDrag) return
        const sectionEntry = entriesByElement.get(event.currentTarget)
        if (!sectionEntry || !engine) return
        const element = resolvePhysicsTarget(sectionEntry.element, event.target)
        const entry = entriesByElement.get(element) || sectionEntry
        const interactive = event.target instanceof Element && Boolean(event.target.closest('a, button, input, select, textarea, [contenteditable="true"]'))
        if (interactive && entry === sectionEntry) return
        pendingDrag = {
            entry,
            sectionEntry,
            point: getDocumentPoint(event),
            startX: event.clientX,
            startY: event.clientY,
            timeStamp: event.timeStamp,
            interactive,
        }
        if (!pendingDrag.interactive) event.preventDefault()
    }

    function handlePointerMove(event) {
        const point = getDocumentPoint(event)
        if (!activeEntry && pendingDrag) {
            const distance = Math.hypot(event.clientX - pendingDrag.startX, event.clientY - pendingDrag.startY)
            if (distance < DRAG_THRESHOLD) return
            const pending = pendingDrag
            pendingDrag = null
            if (pending.entry.kind === 'object') activateObjectMode(pending.sectionEntry)
            else activateSectionMode(pending.sectionEntry)
            beginDrag(pending.entry, pending.point, pending.timeStamp)
            if (pending.interactive) suppressNextClick = true
        }
        if (!activeEntry) return
        moveDraggedEntry(event, point)
        event.preventDefault()
    }

    function finishDrag(event, cancelled = false) {
        if (pendingDrag) {
            pendingDrag = null
            return
        }
        if (!activeEntry) return
        const entry = activeEntry
        activeEntry = null
        const velocity = cancelled ? { x: 0, y: 0 } : entry.drag.velocity
        entry.drag = null
        Matter.Body.setStatic(entry.body, false)
        Matter.Body.setVelocity(entry.body, velocity)
        Matter.Sleeping.set(entry.body, false)
        entry.element.style.zIndex = entry.initialZIndex
    }

    function handleClick(event) {
        if (!suppressNextClick) return
        suppressNextClick = false
        event.preventDefault()
        event.stopImmediatePropagation()
    }

    function reset() {
        pendingDrag = null
        activeEntry = null
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
            syncEntryToElement(entry)
            Matter.Body.setPosition(entry.body, entry.initialPosition)
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
        if (engine) reset()
        if (frameId !== null) cancelFrame(frameId)
        frameId = null
        previousTime = null
        document.removeEventListener('click', handleClick, true)
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', finishDrag)
        window.removeEventListener('pointercancel', handlePointerCancel)
        sectionEntries.forEach((entry) => entry.element.removeEventListener('pointerdown', handlePointerDown))
        entries.forEach((entry) => {
            entry.element.style.translate = entry.initialTranslate
            entry.element.style.zIndex = entry.initialZIndex
            entry.element.style.touchAction = entry.initialTouchAction
            entry.drag = null
        })
        if (engine) Matter.Engine.clear(engine)
        engine = null
    }

    function handlePointerCancel(event) {
        finishDrag(event, true)
    }

    return {
        start() {
            if (destroyed) throw new Error('Physics Toss controller has been destroyed.')
            if (engine) return
            const world = Matter.Engine.create({ enableSleeping: true })
            world.gravity.y = 1
            world.gravity.scale = 0.001
            engine = world
            Matter.Composite.add(engine.world, [
                ...entries.map((entry) => entry.body),
                ...makeBoundaries(bounds.width, bounds.height),
            ])
            entries.forEach((entry) => {
                if (!entry.enabled) entry.body.collisionFilter.mask = 0
                Matter.Sleeping.set(entry.body, true)
                entry.element.style.touchAction = 'none'
            })
            sectionEntries.forEach((entry) => entry.element.addEventListener('pointerdown', handlePointerDown))
            document.addEventListener('click', handleClick, true)
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', finishDrag)
            window.addEventListener('pointercancel', handlePointerCancel)
            frameId = requestFrame(animate)
        },
        stop() {
            stop()
        },
        reset() {
            if (engine) reset()
        },
        destroy() {
            stop()
            destroyed = true
        },
    }
}
