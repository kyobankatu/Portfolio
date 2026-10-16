import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Home from '../../components/Home.jsx'
import ja from '../../locales/ja.json'

afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
})

describe('portfolio screen', () => {
    it('switches the whole screen to English, including research and DPSCalculator', () => {
        render(<Home />)

        fireEvent.click(screen.getByRole('button', { name: 'Switch language to English' }))

        expect(screen.getByRole('heading', { name: 'Research' })).toBeTruthy()
        expect(screen.getByRole('heading', { name: 'Missions' })).toBeTruthy()
        expect(screen.getByText(/DPSCalculator/)).toBeTruthy()
        expect(screen.getByRole('link', { name: /Swallow LLM/ }).getAttribute('href')).toContain('index.en.html')
        expect(screen.queryByText('undefined')).toBeNull()
    })

    it('keeps the screen usable when loaded with an unknown hash', () => {
        window.history.replaceState({}, '', '/#missing-section')
        render(<Home />)

        expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
        expect(screen.getByRole('link', { name: /プロフィール/ }).getAttribute('href')).toBe('#profile')
        expect(screen.queryByText('undefined')).toBeNull()
    })

    it('keeps the navigation target and selected section in sync', () => {
        render(<Home />)

        fireEvent.click(screen.getByRole('link', { name: /研究テーマ/ }))

        expect(screen.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('href', '#research')
        expect(screen.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
        expect(screen.getByRole('heading', { name: 'Research' }).closest('section').id).toBe('research')
    })

    it('fails with a clear message instead of rendering a missing project description', () => {
        const translations = {
            ja: { ...ja, projects: { ...ja.projects, ArtifactSimulator: '' } },
            en: ja,
        }

        expect(() => render(<Home translations={translations} />)).toThrow(/Missing project description for ArtifactSimulator/)
    })
})
