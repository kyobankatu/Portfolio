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
