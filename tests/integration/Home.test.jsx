import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Home from '../../components/Home.jsx'
import ja from '../../locales/ja.json'
import en from '../../locales/en.json'

afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
})

describe('portfolio screen', () => {
    it('switches research and project descriptions to their English translations', () => {
        render(<Home />)
        expect(screen.getByText(ja.research.eventCamera)).toBeInTheDocument()
        expect(screen.getByText(ja.projects.DPSCalculator)).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Switch language to English' }))

        expect(screen.getByText(en.research.eventCamera)).toBeInTheDocument()
        expect(screen.getByText(en.projects.DPSCalculator)).toBeInTheDocument()
        expect(screen.queryByText(ja.research.eventCamera)).not.toBeInTheDocument()
        expect(screen.queryByText(ja.projects.DPSCalculator)).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Swallow LLM/ }).getAttribute('href')).toContain('index.en.html')
        expect(screen.getByRole('button', { name: 'Switch language to Japanese' })).toBeInTheDocument()
        expect(screen.queryByText('undefined')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Switch language to Japanese' }))

        expect(screen.getByRole('button', { name: 'Switch language to English' })).toBeInTheDocument()
    })

    it('keeps the screen usable when loaded with an unknown hash', () => {
        window.history.replaceState({}, '', '/#missing-section')
        render(<Home />)

        expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
        expect(screen.getByRole('link', { name: /プロフィール/ }).getAttribute('href')).toBe('#profile')
        expect(screen.getByRole('link', { name: /プロフィール/ })).toHaveAttribute('aria-current', 'location')
        expect(screen.queryByText('undefined')).toBeNull()
    })

    it('initializes the active navigation and introduction from a valid hash', () => {
        window.history.replaceState({}, '', '/#research')
        render(<Home />)

        expect(screen.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
        expect(screen.getByRole('status')).toHaveTextContent('イベントカメラとLLMを研究しています。')
    })

    it('keeps the navigation target and selected section in sync', () => {
        render(<Home />)

        fireEvent.click(screen.getByRole('link', { name: /研究テーマ/ }))

        expect(screen.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('href', '#research')
        expect(screen.getByRole('link', { name: /研究テーマ/ })).toHaveAttribute('aria-current', 'location')
        expect(screen.getByRole('heading', { name: 'Research' }).closest('section').id).toBe('research')
        expect(screen.getByRole('status')).toHaveTextContent('イベントカメラ')
    })

    it('fails with a clear message instead of rendering a missing project description', () => {
        const translations = {
            ja: { ...ja, projects: { ...ja.projects, ArtifactSimulator: '' } },
            en: ja,
        }

        expect(() => render(<Home translations={translations} />)).toThrow(/Missing project description for ArtifactSimulator/)
    })
})
