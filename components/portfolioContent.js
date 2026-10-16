export const projectDefinitions = [
    {
        key: 'ArtifactSimulator',
        kind: 'WEB APP',
        techs: ['Vue.js', 'Python', 'Google Cloud Vision'],
        github: 'https://github.com/kyobankatu/ArtifactSimulator-Frontend',
        url: 'https://artifact.katumon.com',
    },
    {
        key: 'DPSCalculator',
        kind: 'GAME SIMULATION',
        techs: ['Java', 'Gradle', 'Python'],
        github: 'https://github.com/kyobankatu/GenshinImpactDPSCalculator',
        url: 'https://kyobankatu.github.io/GenshinImpactDPSCalculator/simulation_report.html',
    },
    {
        key: 'ClipboardSync',
        kind: 'CROSS-PLATFORM TOOL',
        techs: ['Java', 'Spring Boot', 'WebSocket'],
        github: 'https://github.com/kyobankatu/ClipboardSync',
    },
    {
        key: 'Portfolio',
        kind: 'WEB APP',
        techs: ['Next.js', 'React', 'Kubernetes'],
        github: 'https://github.com/kyobankatu/Portfolio',
        url: 'https://portfolio.katumon.com/',
    },
    {
        key: 'ArtifactSimulator-Backend',
        kind: 'BACKEND API',
        techs: ['Python', 'Flask', 'Google Cloud Vision'],
        github: 'https://github.com/kyobankatu/ArtifactSimulator-Backend',
    },
    {
        key: 'ZZZ-SearchApi',
        kind: 'SEARCH API',
        techs: ['Python', 'Flask', 'Cloud Run'],
        github: 'https://github.com/kyobankatu/ZZZ-SearchApi',
    },
    {
        key: 'ZZZ-SearchOverlay',
        kind: 'DESKTOP APP',
        techs: ['Electron', 'Node.js'],
        github: 'https://github.com/kyobankatu/ZZZ-SearchOverlay',
    },
    {
        key: 'NeuralNetwork',
        kind: 'EXPERIMENT',
        techs: ['C', 'Python'],
        github: 'https://github.com/kyobankatu/NeuralNetwork',
    },
]

export const skillGroups = [
    { category: 'Languages', skills: ['Java', 'Python', 'C', 'JavaScript', 'TypeScript'] },
    { category: 'Frontend', skills: ['Next.js', 'React', 'Vue.js', 'HTML', 'CSS'] },
    { category: 'Backend & Data', skills: ['Spring Boot', 'Flask', 'PostgreSQL', 'WebSocket'] },
    { category: 'Tools & Cloud', skills: ['Git', 'Docker', 'Kubernetes', 'Google Cloud'] },
]

export const sectionIds = ['profile', 'research', 'missions', 'equipment', 'interests', 'contact']

export function resolveActiveSection(sectionId, currentSection) {
    if (sectionIds.includes(sectionId)) {
        return sectionId
    }

    return sectionIds.includes(currentSection) ? currentSection : 'profile'
}

export function getProjectCards(locale) {
    return projectDefinitions.map((project) => {
        const description = locale?.projects?.[project.key]
        if (typeof description !== 'string' || description.trim() === '') {
            throw new Error(`Missing project description for ${project.key}`)
        }

        return { ...project, description }
    })
}
