import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPhysicsTossController, resolvePhysicsTarget } from '../../components/physicsTossController.js'

function createFrameScheduler() {
    let nextId = 0
    const frames = new Map()

    return {
        requestFrame(callback) {
            nextId += 1
            frames.set(nextId, callback)
            return nextId
        },
        cancelFrame(id) {
            frames.delete(id)
        },
        advance(timestamp) {
            const pending = [...frames.entries()]
            frames.clear()
            pending.forEach(([, callback]) => callback(timestamp))
        },
        get pendingCount() {
            return frames.size
        },
    }
}

function createTarget(rect = { x: 100, y: 100, width: 120, height: 80 }) {
    const target = document.createElement('section')
    target.getBoundingClientRect = () => ({
        ...rect,
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
    })
    document.body.append(target)
    return target
}

function createTransformAwareTarget(rect) {
    const target = document.createElement('section')
    target.getBoundingClientRect = () => {
        const [translateX, translateY] = target.style.translate.split(' ')
        const x = rect.x + (Number.parseFloat(translateX) || 0)
        const y = rect.y + (Number.parseFloat(translateY) || 0)
        return { x, y, left: x, top: y, right: x + rect.width, bottom: y + rect.height, width: rect.width, height: rect.height }
    }
    document.body.append(target)
    return target
}

function createPhysicsObject(rect) {
    const object = document.createElement('article')
    object.dataset.physicsObject = ''
    object.getBoundingClientRect = () => {
        const [translateX, translateY] = object.style.translate.split(' ')
        const [parentTranslateX, parentTranslateY] = object.parentElement?.style.translate.split(' ') ?? []
        const x = rect.x + (Number.parseFloat(translateX) || 0) + (Number.parseFloat(parentTranslateX) || 0)
        const y = rect.y + (Number.parseFloat(translateY) || 0) + (Number.parseFloat(parentTranslateY) || 0)
        return { x, y, left: x, top: y, right: x + rect.width, bottom: y + rect.height, width: rect.width, height: rect.height }
    }
    return object
}

afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
})

describe('Physics Toss controller', () => {
    it('selects a marked child over its section and falls back to the section whitespace', () => {
        const section = createTarget()
        const object = document.createElement('article')
        object.dataset.physicsObject = ''
        const text = document.createElement('span')
        object.append(text)
        section.append(object)

        expect(resolvePhysicsTarget(section, text)).toBe(object)
        expect(resolvePhysicsTarget(section, section)).toBe(section)
    })

    it('moves one child independently and moves the whole section from its whitespace', () => {
        const section = createTarget({ x: 100, y: 100, width: 300, height: 200 })
        const object = document.createElement('article')
        object.dataset.physicsObject = ''
        object.getBoundingClientRect = () => ({
            x: 150,
            y: 150,
            left: 150,
            top: 150,
            right: 230,
            bottom: 200,
            width: 80,
            height: 50,
        })
        section.append(object)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        object.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 190,
            clientY: 175,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 230, clientY: 215 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 230, clientY: 215 }))
        scheduler.advance(16)

        expect(object.style.translate).not.toBe('')
        expect(section.style.translate).toBe('')

        controller.reset()
        section.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 110,
            clientY: 110,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 160, clientY: 140 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 160, clientY: 140 }))
        scheduler.advance(32)

        expect(section.style.translate).not.toBe('')
        expect(object.style.translate).toBe('')
        controller.destroy()
    })

    it('preserves a moved sibling when switching to another child object', () => {
        const section = createTarget({ x: 0, y: 0, width: 600, height: 500 })
        const first = createPhysicsObject({ x: 100, y: 100, width: 80, height: 50 })
        const second = createPhysicsObject({ x: 240, y: 100, width: 80, height: 50 })
        section.append(first, second)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        first.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 140, clientY: 125 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 170, clientY: 145 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 170, clientY: 145 }))
        const firstOffset = first.style.translate
        expect(firstOffset).not.toBe('')
        second.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 280, clientY: 125 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 135 }))
        scheduler.advance(16)

        expect(first.style.translate).toBe(firstOffset)
        controller.destroy()
    })

    it('preserves a moved section when switching to one of its child objects', () => {
        const section = createTransformAwareTarget({ x: 0, y: 0, width: 600, height: 500 })
        const object = createPhysicsObject({ x: 100, y: 100, width: 80, height: 50 })
        section.append(object)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
            matchMedia: () => ({ matches: true }),
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        section.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 30, clientY: 30 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 60, clientY: 50 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 60, clientY: 50 }))
        const sectionOffset = section.style.translate
        expect(sectionOffset).not.toBe('')

        object.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 170, clientY: 145 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 190, clientY: 155 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 190, clientY: 155 }))

        expect(section.style.translate).toBe(sectionOffset)
        expect(object.style.translate).not.toBe('')
        controller.destroy()
    })

    it('reflows physics bodies and reset positions after layout changes', () => {
        const rect = { x: 100, y: 100, width: 120, height: 80 }
        const target = createTarget(rect)
        target.getBoundingClientRect = () => ({ ...rect, left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height })
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            getBounds: () => ({ width: 700, height: 600 }),
            matchMedia: () => ({ matches: true }),
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 160, clientY: 140 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 190, clientY: 140 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 190, clientY: 140 }))
        rect.x = 300
        rect.y = 120
        rect.width = 180
        rect.height = 100
        window.dispatchEvent(new Event('resize'))
        controller.reset()
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 390, clientY: 170 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 900, clientY: 170 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 900, clientY: 170 }))

        expect(Number.parseFloat(target.style.translate.split(' ')[0])).toBeLessThanOrEqual(220.001)
        controller.destroy()
    })

    it('lets a released target fall under gravity and settle on the floor', () => {
        const target = createTarget({ x: 100, y: 480, width: 120, height: 80 })
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 160, clientY: 520 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 168, clientY: 520 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 168, clientY: 520 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 168, clientY: 520 }))
        for (let frame = 1; frame <= 600; frame += 1) {
            scheduler.advance(frame * 16)
        }

        const verticalOffset = Number.parseFloat(target.style.translate.split(' ')[1])
        expect(verticalOffset).toBeGreaterThan(0)
        expect(verticalOffset).toBeLessThanOrEqual(40.001)
        controller.destroy()
    })

    it('moves a resting sibling when a physics object collides with it', () => {
        const section = createTarget({ x: 0, y: 0, width: 600, height: 600 })
        const first = document.createElement('article')
        const second = document.createElement('article')
        first.dataset.physicsObject = ''
        second.dataset.physicsObject = ''
        first.getBoundingClientRect = () => ({ x: 100, y: 100, left: 100, top: 100, right: 180, bottom: 160, width: 80, height: 60 })
        second.getBoundingClientRect = () => ({ x: 100, y: 220, left: 100, top: 220, right: 180, bottom: 280, width: 80, height: 60 })
        section.append(first, second)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        first.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 140,
            clientY: 130,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 270 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 140, clientY: 270 }))
        for (let frame = 1; frame <= 60; frame += 1) {
            scheduler.advance(frame * 16)
        }

        expect(first.style.translate).not.toBe('')
        expect(second.style.translate).not.toBe('')
        controller.destroy()
    })

    it('keeps a dragged object inside the left edge', () => {
        const section = createTarget({ x: 0, y: 0, width: 600, height: 600 })
        const object = document.createElement('article')
        object.dataset.physicsObject = ''
        object.getBoundingClientRect = () => ({ x: 100, y: 100, left: 100, top: 100, right: 220, bottom: 180, width: 120, height: 80 })
        section.append(object)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        object.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 140 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, clientY: 140 }))
        scheduler.advance(16)

        const horizontalOffset = Number.parseFloat(object.style.translate.split(' ')[0])
        expect(horizontalOffset).toBeGreaterThanOrEqual(-100.001)
        expect(horizontalOffset).toBeLessThanOrEqual(0)
        controller.destroy()
    })

    it('rejects bounds that cannot contain a physics world', () => {
        expect(() => createPhysicsTossController({
            targets: [],
            bounds: { width: 0, height: Number.NaN },
        })).toThrow(RangeError)
    })

    it('supports Space and arrow-key movement and restores its focus attributes', () => {
        const target = createTarget()
        target.setAttribute('aria-describedby', 'existing-description')
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            instructionsId: 'physics-instructions',
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        expect(target.tabIndex).toBe(0)
        expect(target.style.touchAction).toBe('pan-y')
        expect(target.getAttribute('aria-describedby')).toBe('existing-description physics-instructions')
        target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }))
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
        expect(target.style.translate).toContain('16px')
        target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }))
        controller.stop()

        expect(target.getAttribute('tabindex')).toBeNull()
        expect(target.getAttribute('aria-describedby')).toBe('existing-description')
        controller.destroy()
    })

    it('keeps direct manipulation but stops inertia when reduced motion is requested', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        const mediaQuery = {
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            matchMedia: () => mediaQuery,
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        expect(scheduler.pendingCount).toBe(0)
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 220, clientY: 180 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 220, clientY: 180 }))
        const positionAfterRelease = target.style.translate
        scheduler.advance(500)

        expect(positionAfterRelease).not.toBe('')
        expect(target.style.translate).toBe(positionAfterRelease)
        expect(scheduler.pendingCount).toBe(0)
        controller.destroy()
    })

    it('stops an active physics loop when the reduced-motion preference changes', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        let preferenceChanged
        const mediaQuery = {
            matches: false,
            addEventListener: vi.fn((type, listener) => { preferenceChanged = listener }),
            removeEventListener: vi.fn(),
        }
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            matchMedia: () => mediaQuery,
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 220, clientY: 180 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 220, clientY: 180 }))
        mediaQuery.matches = true
        preferenceChanged({ matches: true })
        const positionAfterPreferenceChange = target.style.translate
        scheduler.advance(500)

        expect(scheduler.pendingCount).toBe(0)
        expect(target.style.translate).toBe(positionAfterPreferenceChange)
        controller.destroy()
        expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce()
    })

    it('rebuilds the screen boundaries after a resize', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        let currentBounds = { width: 800, height: 600 }
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: currentBounds,
            getBounds: () => currentBounds,
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        currentBounds = { width: 400, height: 300 }
        window.dispatchEvent(new Event('resize'))
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 600, clientY: 140 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 600, clientY: 140 }))

        const horizontalOffset = Number.parseFloat(target.style.translate.split(' ')[0])
        expect(horizontalOffset).toBeLessThanOrEqual(180)
        controller.destroy()
    })

    it('resynchronizes sticky targets with their viewport position after scrolling', () => {
        const rect = { x: 100, y: 100, width: 120, height: 80 }
        const target = createTarget(rect)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 1200 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        rect.y = 0
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 })
        window.dispatchEvent(new Event('scroll'))
        scheduler.advance(16)
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 40,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 180, clientY: 40 }))

        const zIndexDuringDrag = target.style.zIndex
        const translateDuringDrag = target.style.translate
        controller.destroy()
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
        expect(zIndexDuringDrag).toBe('10')
        expect(translateDuringDrag).toBe('20px 0px')
    })

    it('keeps a dragged target inside the top edge', () => {
        const section = createTarget({ x: 0, y: 0, width: 600, height: 600 })
        const object = document.createElement('article')
        object.dataset.physicsObject = ''
        object.getBoundingClientRect = () => ({ x: 100, y: 100, left: 100, top: 100, right: 220, bottom: 180, width: 120, height: 80 })
        section.append(object)
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
        })

        controller.start()
        object.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 160, clientY: -100 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 160, clientY: -100 }))

        const verticalOffset = Number.parseFloat(object.style.translate.split(' ')[1])
        expect(verticalOffset).toBeCloseTo(-100, 2)
        controller.destroy()
    })

    it('keeps targets in place until tossed, then restores their original layout on reset', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        scheduler.advance(16)
        expect(target.style.translate).toBe('')

        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 220, clientY: 220 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 240, clientY: 250 }))
        scheduler.advance(32)

        expect(target.style.translate).not.toBe('')

        controller.reset()

        expect(target.style.translate).toBe('')
        controller.stop()
        expect(scheduler.pendingCount).toBe(0)
        controller.destroy()
    })

    it('keeps a reflowed child aligned when it is reset and dragged again', () => {
        const section = createTarget({ x: 0, y: 0, width: 600, height: 500 })
        const rect = { x: 100, y: 100, width: 80, height: 50 }
        const object = createPhysicsObject(rect)
        section.append(object)
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
        })

        controller.start()
        object.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 140, clientY: 125 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 190, clientY: 165 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 190, clientY: 165 }))
        expect(object.style.translate).not.toBe('')

        rect.x = 120
        rect.y = 120
        controller.refreshLayout()
        controller.reset()
        expect(object.style.translate).toBe('')

        object.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 160, clientY: 145 }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 170, clientY: 145 }))

        expect(object.style.translate).toBe('10px 0px')
        controller.destroy()
    })

    it('leaves Space activation on nested buttons to the browser', () => {
        const section = createTarget()
        const button = document.createElement('button')
        button.dataset.physicsObject = ''
        section.append(button)
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
        })
        const event = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            bubbles: true,
            cancelable: true,
        })

        controller.start()
        button.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
        expect(button.style.zIndex).toBe('')
        controller.destroy()
    })

    it('leaves Space scrolling on nested links to the browser', () => {
        const section = createTarget()
        const link = document.createElement('a')
        link.href = '#profile'
        link.dataset.physicsObject = ''
        section.append(link)
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
        })
        const event = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            bubbles: true,
            cancelable: true,
        })

        controller.start()
        link.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
        expect(link.style.zIndex).toBe('')
        controller.destroy()
    })

    it('prevents repeated Space keydowns from scrolling a physics target', () => {
        const section = createTarget()
        const controller = createPhysicsTossController({
            targets: [section],
            bounds: { width: 800, height: 600 },
        })
        const event = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            repeat: true,
            bubbles: true,
            cancelable: true,
        })

        controller.start()
        section.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(true)
        expect(section.style.zIndex).toBe('')
        controller.destroy()
    })

    it('carries pointer speed into the released target', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })
        const pointerDown = new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        })
        const pointerMove = new MouseEvent('pointermove', { clientX: 220, clientY: 160 })
        const pointerUp = new MouseEvent('pointerup', { clientX: 220, clientY: 160 })
        Object.defineProperty(pointerDown, 'timeStamp', { value: 10 })
        Object.defineProperty(pointerMove, 'timeStamp', { value: 26 })
        Object.defineProperty(pointerUp, 'timeStamp', { value: 27 })

        controller.start()
        target.dispatchEvent(pointerDown)
        window.dispatchEvent(pointerMove)
        window.dispatchEvent(pointerUp)
        scheduler.advance(16)

        const horizontalOffset = Number.parseFloat(target.style.translate.split(' ')[0])
        expect(horizontalOffset).toBeGreaterThan(60)
        controller.destroy()
    })

    it('cancels animation and rejects attempts to restart after destruction', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        controller.destroy()

        expect(scheduler.pendingCount).toBe(0)
        expect(target.style.translate).toBe('')
        expect(() => controller.start()).toThrow(/destroyed/)
    })

    it('allows another drag after a pointer is cancelled', () => {
        const target = createTarget()
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 220, clientY: 160 }))
        window.dispatchEvent(new MouseEvent('pointercancel'))
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 220,
            clientY: 160,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 260, clientY: 200 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 260, clientY: 200 }))
        scheduler.advance(16)

        expect(target.style.translate).not.toBe('')
        controller.destroy()
    })

    it('keeps a thrown target above the physics floor', () => {
        const target = createTarget({ x: 100, y: 480, width: 120, height: 80 })
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        target.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 520,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 160, clientY: 680 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 160, clientY: 680 }))
        for (let frame = 1; frame <= 180; frame += 1) {
            scheduler.advance(frame * 16)
        }

        const verticalOffset = Number.parseFloat(target.style.translate.split(' ')[1])
        expect(verticalOffset).toBeGreaterThanOrEqual(35)
        expect(verticalOffset).toBeLessThanOrEqual(45)
        controller.destroy()
    })

    it('does not turn links inside a physics target into drags', () => {
        const target = createTarget()
        const link = document.createElement('a')
        link.href = '#contact'
        target.append(link)
        const scheduler = createFrameScheduler()
        const controller = createPhysicsTossController({
            targets: [target],
            bounds: { width: 800, height: 600 },
            requestFrame: scheduler.requestFrame,
            cancelFrame: scheduler.cancelFrame,
        })

        controller.start()
        link.dispatchEvent(new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 160,
            clientY: 140,
        }))
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 250, clientY: 250 }))
        window.dispatchEvent(new MouseEvent('pointerup', { clientX: 250, clientY: 250 }))
        scheduler.advance(16)

        expect(target.style.translate).toBe('')
        controller.destroy()
    })
})
