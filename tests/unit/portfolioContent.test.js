import { describe, expect, it } from 'vitest'
import { getProjectCards, resolveActiveSection } from '../../components/portfolioContent.js'
import ja from '../../locales/ja.json'
import en from '../../locales/en.json'

describe('getProjectCards', () => {
    it('returns localized projects with DPSCalculator links', () => {
        const cards = getProjectCards(ja)
        const calculator = cards.find((project) => project.key === 'DPSCalculator')

        expect(calculator.description).toBeTruthy()
        expect(calculator.github).toBe('https://github.com/kyobankatu/GenshinImpactDPSCalculator')
        expect(calculator.url).toContain('simulation_report.html')
        expect(cards.some((project) => project.key === 'PainRecorder')).toBe(false)
        expect(getProjectCards(en).find((project) => project.key === 'DPSCalculator').description).not.toBe(calculator.description)
    })

    it.each([undefined, '', '   '])('rejects a missing or empty project description (%s)', (description) => {
        const invalidLocale = { ...ja, projects: { ...ja.projects, ArtifactSimulator: description } }

        expect(() => getProjectCards(invalidLocale)).toThrow(/Missing project description for ArtifactSimulator/i)
    })
})

describe('resolveActiveSection', () => {
    it('selects a known portfolio section', () => {
        expect(resolveActiveSection('research', 'profile')).toBe('research')
    })

    it('preserves the current section for an unknown section id', () => {
        expect(resolveActiveSection('missing-section', 'profile')).toBe('profile')
        expect(resolveActiveSection('missing-section', 'research')).toBe('research')
    })
})
