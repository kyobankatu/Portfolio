import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPhysicsTossController } from '../../components/physicsTossController.js'

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
    it('rejects bounds that cannot contain a physics world', () => {
        expect(() => createPhysicsTossController({
            targets: [],
            bounds: { width: 0, height: Number.NaN },
        })).toThrow(RangeError)
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
