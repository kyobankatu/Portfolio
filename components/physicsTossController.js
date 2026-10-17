import Matter from 'matter-js'

const BASE_DELTA = 1000 / 60
const MAX_VELOCITY = 25

function getDocumentPoint(event) {
    return {
        x: event.clientX + window.scrollX,
        y: event.clientY + window.scrollY,
    }
}

function isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest('a, button, input, select, textarea, [contenteditable="true"]'))
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

    const entries = targets.map((element) => {
        const rect = element.getBoundingClientRect()
        const x = rect.left + window.scrollX
        const y = rect.top + window.scrollY
        const body = Matter.Bodies.rectangle(x + rect.width / 2, y + rect.height / 2, rect.width, rect.height, {
            restitution: 0.2,
            friction: 0.7,
            frictionAir: 0.015,
            inertia: Infinity,
            label: element.id || 'physics-target',
        })

        return {
            element,
            body,
            initialPosition: { x: body.position.x, y: body.position.y },
            initialAngle: body.angle,
            initialTranslate: element.style.translate,
            initialZIndex: element.style.zIndex,
            initialTouchAction: element.style.touchAction,
            drag: null,
        }
    })

    let engine = null
    let frameId = null
    let previousTime = null
    let destroyed = false

    function render(entry) {
        if (!entry.element.isConnected) return
        const deltaX = entry.body.position.x - entry.initialPosition.x
        const deltaY = entry.body.position.y - entry.initialPosition.y
        if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) {
            entry.element.style.translate = entry.initialTranslate
            return
        }
        entry.element.style.translate = `${deltaX}px ${deltaY}px`
    }

    function animate(timestamp) {
        if (!engine) return
        const delta = previousTime === null ? BASE_DELTA : Math.min(Math.max(timestamp - previousTime, 1), 33)
        previousTime = timestamp
        Matter.Engine.update(engine, delta)
        entries.forEach(render)
        frameId = requestFrame(animate)
    }

    function getEntry(element) {
        return entries.find((entry) => entry.element === element)
    }

    function handlePointerDown(event) {
        if (event.button !== 0 || isInteractiveTarget(event.target)) return
        const entry = getEntry(event.currentTarget)
        if (!entry || !engine) return
        const point = getDocumentPoint(event)
        Matter.Sleeping.set(entry.body, false)
        Matter.Body.setStatic(entry.body, true)
        entry.drag = {
            offsetX: point.x - entry.body.position.x,
            offsetY: point.y - entry.body.position.y,
            lastTime: event.timeStamp,
            velocity: { x: 0, y: 0 },
        }
        entry.element.style.zIndex = '10'
        event.preventDefault()
    }

    function handlePointerMove(event) {
        const entry = entries.find((candidate) => candidate.drag)
        if (!entry) return
        const point = getDocumentPoint(event)
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
        Matter.Body.setPosition(entry.body, {
            x: position.x,
            y: position.y,
        })
        entry.drag.lastTime = event.timeStamp
    }

    function handlePointerUp(event) {
        const entry = entries.find((candidate) => candidate.drag)
        if (!entry) return
        const { velocity } = entry.drag
        entry.drag = null
        Matter.Body.setStatic(entry.body, false)
        Matter.Body.setVelocity(entry.body, velocity)
        Matter.Sleeping.set(entry.body, false)
    }

    function reset() {
        entries.forEach((entry) => {
            entry.drag = null
            Matter.Body.setStatic(entry.body, false)
            Matter.Body.setPosition(entry.body, entry.initialPosition)
            Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
            Matter.Body.setAngle(entry.body, entry.initialAngle)
            Matter.Body.setAngularVelocity(entry.body, 0)
            Matter.Sleeping.set(entry.body, true)
            entry.element.style.translate = entry.initialTranslate
            entry.element.style.zIndex = entry.initialZIndex
            render(entry)
            entry.element.style.translate = entry.initialTranslate
        })
    }

    function stop() {
        if (engine) reset()
        if (frameId !== null) cancelFrame(frameId)
        frameId = null
        previousTime = null
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerUp)
        entries.forEach((entry) => {
            entry.element.removeEventListener('pointerdown', handlePointerDown)
            entry.element.style.translate = entry.initialTranslate
            entry.element.style.zIndex = entry.initialZIndex
            entry.element.style.touchAction = entry.initialTouchAction
            entry.drag = null
        })
        if (engine) Matter.Engine.clear(engine)
        engine = null
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
                Matter.Sleeping.set(entry.body, true)
                entry.element.style.touchAction = 'none'
                entry.element.addEventListener('pointerdown', handlePointerDown)
            })
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', handlePointerUp)
            window.addEventListener('pointercancel', handlePointerUp)
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
