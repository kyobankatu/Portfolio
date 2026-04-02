'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Home.module.css'
import ja from '../locales/ja.json'
import en from '../locales/en.json'
import { FaEnvelope, FaLinkedin, FaGithub } from 'react-icons/fa'

const skillGroups = [
    {
        category: 'Languages',
        skills: [
            { name: 'Java', level: 5 },
            { name: 'Python', level: 4 },
            { name: 'C', level: 4 },
            { name: 'JavaScript', level: 3 },
            { name: 'TypeScript', level: 3 },
            { name: 'MATLAB', level: 2 },
            { name: 'Scala', level: 1 },
            { name: 'Verilog-HDL', level: 1 },
        ],
    },
    {
        category: 'Frameworks',
        skills: [
            { name: 'Next.js', level: 3 },
            { name: 'Vue.js', level: 3 },
            { name: 'React', level: 1 },
        ],
    },
    {
        category: 'Markup/Style',
        skills: [
            { name: 'HTML/CSS', level: 4 },
        ],
    },
    {
        category: 'Database',
        skills: [
            { name: 'PostgreSQL', level: 3 },
        ],
    },
    {
        category: 'Tools',
        skills: [
            { name: 'Git', level: 4 },
            { name: 'Docker', level: 3 },
            { name: 'Google Cloud', level: 3 },
        ],
    },
    {
        category: 'Learning',
        skills: [
            { name: 'Chinese', level: null },
            { name: 'Quantum Computing', level: null },
        ],
    },
    {
        category: 'Qualifications',
        skills: [
            { name: 'TOEIC 925', level: null },
            { name: '統計検定１級', level: null },
        ],
    },
    {
        category: 'Life Skills',
        skills: [
            { name: 'Juggling', level: 2 },
            { name: 'GenshinImpact', level: 5 },
        ],
    },
]

const projects = [
    {
        name: 'Portfolio',
        techs: ['Next.js', 'Vercel'],
        github: 'https://github.com/kyobankatu/Portfolio',
        url: 'https://katumon-portfolio.vercel.app/',
    },
    {
        name: 'PainRecorder',
        techs: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Docker', 'Cloud Run', 'Neon'],
        github: 'https://github.com/kyobankatu/PainRecorder',
        url: 'https://painrecorder-474392225909.asia-northeast1.run.app/',
    },
    {
        name: 'GenshinImpactDPSCalculator',
        techs: ['Java', 'Gradle', 'Python'],
        github: 'https://github.com/kyobankatu/GenshinImpactDPSCalculator',
        url: 'https://kyobankatu.github.io/GenshinImpactDPSCalculator/simulation_report.html',
    },
    {
        name: 'ArtifactSimulator',
        techs: ['Vue.js', 'Vercel'],
        github: 'https://github.com/kyobankatu/ArtifactSimulator-Vercel',
        url: 'https://artifact-simulator.vercel.app/',
    },
    {
        name: 'ArtifactSimulator-Backend',
        techs: ['Python', 'Flask', 'Google Cloud Vision API', 'Docker', 'Render'],
        github: 'https://github.com/kyobankatu/Artifact-Simulator-Backend',
        url: null,
    },
    {
        name: 'ZZZ-SearchApi',
        techs: ['Python', 'Flask', 'Google Cloud Translation API', 'BeautifulSoup4', 'Docker', 'Cloud Run'],
        github: 'https://github.com/kyobankatu/ZZZ-SearchApi',
        url: null,
    },
    {
        name: 'ZZZ-SearchOverlay',
        techs: ['Electron', 'Node.js'],
        github: 'https://github.com/kyobankatu/ZZZ-SearchOverlay',
        url: null,
    },
    {
        name: 'NeuralNetwork',
        techs: ['C', 'Python'],
        github: 'https://github.com/kyobankatu/NeuralNetwork',
        url: null,
    },
]

const config = {
    spawnInterval: 900,
    maxOrbs: 6,
    colors: [
        'rgba(191,160,70,0.95)',
        'rgba(102,200,210,0.9)',
        'rgba(141,230,203,0.9)',
        'rgba(255,220,160,0.95)',
    ],
    sizeRange: [28, 110],
    durationRange: [3.8, 9.5],
    verticalPaddingPercent: 8,
}

const rand = (min, max) => Math.random() * (max - min) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export default function Home() {
    const [orbs, setOrbs] = useState([])
    const [lang, setLang] = useState('ja')
    const t = lang === 'ja' ? ja : en
    const nextId = useRef(1)

    const scrollTo = (id) => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        function spawnOrb() {
            setOrbs((prev) => {
                if (prev.length >= config.maxOrbs) return prev

                const size = Math.round(rand(config.sizeRange[0], config.sizeRange[1]))
                const left = Math.round(rand(4, 96))
                const top = Math.round(rand(config.verticalPaddingPercent, 100 - config.verticalPaddingPercent))
                const duration = +rand(config.durationRange[0], config.durationRange[1]).toFixed(2)
                const delay = +rand(0, 1.2).toFixed(2)
                const color = pick(config.colors)
                const id = nextId.current++

                const totalMs = Math.round((delay + duration) * 1000) + 300
                setTimeout(() => {
                    setOrbs((o) => o.filter((orb) => orb.id !== id))
                }, totalMs)

                return [...prev, { id, left, top, size, duration, delay, color }]
            })
        }

        for (let i = 0; i < 3; i++) spawnOrb()
        const timer = setInterval(spawnOrb, config.spawnInterval)
        return () => clearInterval(timer)
    }, [])

    return (
        <>
            <button
                className={styles.langToggle}
                onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
            >
                {lang === 'ja' ? 'EN' : 'JA'}
            </button>
            <div className={styles.orbLayer} aria-hidden="true">
                {orbs.map((orb) => (
                    <div
                        key={orb.id}
                        className={styles.orb}
                        style={{
                            left: orb.left + '%',
                            top: orb.top + '%',
                            width: orb.size + 'px',
                            height: orb.size + 'px',
                            background: `radial-gradient(circle at 30% 30%, ${orb.color}, rgba(255,255,255,0.06))`,
                            animationDuration: `${orb.duration}s`,
                            animationDelay: `${orb.delay}s`,
                            transform: 'translate3d(-50%, -50%, 0)',
                        }}
                    />
                ))}
            </div>

            <section className={styles.selfInfo}>
                <div className={styles.selfInner}>
                    <div className={styles.profileCard}>
                        <div className={styles.avatarWrap}>
                            <img className={styles.avatar} src="/avatar-placeholder.png" alt="avatar" />
                        </div>
                        <div className={styles.profileText}>
                            <h3>{t.name}</h3>
                        </div>
                    </div>

                    <div className={styles.selfContent}>
                        <div className={styles.eyebrow}>Portfolio</div>
                        <h1 className={styles.heroTitle}>
                            {t.name}
                            <span className={styles.gold}> — </span>
                            <span className={styles.role}>{t.role}</span>
                        </h1>
                        <p className={styles.tagline}>{t.tagline}</p>
                        <p className={styles.bio}>{t.bio}</p>

                        <div className={styles.actions}>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('skills')}>
                                Skills
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('research')}>
                                Research
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('projects')}>
                                Projects
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('contact')}>
                                Contact
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('hobbies')}>
                                Hobbies
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section id="skills" className={styles.sectionPlaceholder}>
                <h2>Skills</h2>
                <div className={styles.skillGroups}>
                    {skillGroups.map((g) => (
                        <div key={g.category} className={styles.skillGroup}>
                            <p className={styles.skillCategory}>{g.category}</p>
                            <div className={styles.skillList}>
                                {g.skills.map((s) => (
                                    <span key={s.name} className={styles.skill}>
                                        {s.name}
                                        {s.level !== null && (
                                            <span className={styles.skillLevel}>
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <span
                                                        key={i}
                                                        className={i <= s.level ? styles.dotFilled : styles.dotEmpty}
                                                    />
                                                ))}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="research" className={styles.sectionPlaceholder}>
                <h2>Research</h2>
                {/*<span className={styles.labLink}>{t.research.labName}</span>*/}
                <p>{t.research.description}</p>
            </section>

            <section id="projects" className={styles.sectionPlaceholder}>
                <h2>Projects</h2>
                <div className={styles.projectList}>
                    {projects.map((p) => (
                        <div key={p.name} className={styles.projectCard}>
                            <div className={styles.projectCardHeader}>
                                <span className={styles.projectName}>{p.name}</span>
                                <div className={styles.projectLinks}>
                                    <a href={p.github} target="_blank" rel="noreferrer" className={styles.projectLink}>
                                        GitHub
                                    </a>
                                    {p.url && (
                                        <a href={p.url} target="_blank" rel="noreferrer" className={`${styles.projectLink}`}>
                                            Live
                                        </a>
                                    )}
                                </div>
                            </div>
                            <p className={styles.projectDesc}>{t.projects[p.name]}</p>
                            <div className={styles.techBadges}>
                                {p.techs.map((t) => (
                                    <span key={t} className={styles.techBadge}>{t}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="contact" className={`${styles.sectionPlaceholder}`}>
                <h2>Contact</h2>
                <div className={styles.contactList}>
                    <a className={styles.contactCard} href="mailto:kento.ota@rio.scrc.iir.isct.ac.jp">
                        <FaEnvelope size={20} className={styles.contactIcon} />
                        <span className={styles.contactLabel}>Email</span>
                        <span className={styles.contactValue}>kento.ota@rio.scrc.iir.isct.ac.jp</span>
                    </a>
                    <a className={styles.contactCard} href="mailto:ota.k.5051@m.isct.ac.jp">
                        <FaEnvelope size={20} className={styles.contactIcon} />
                        <span className={styles.contactLabel}>Email</span>
                        <span className={styles.contactValue}>ota.k.5051@m.isct.ac.jp</span>
                    </a>
                    <a className={styles.contactCard} href="https://www.linkedin.com/in/kento-ota-84bb6a382" target="_blank" rel="noreferrer">
                        <FaLinkedin size={20} className={styles.contactIcon} />
                        <span className={styles.contactLabel}>LinkedIn</span>
                        <span className={styles.contactValue}>kento-ota-84bb6a382</span>
                    </a>
                    <a className={styles.contactCard} href="https://github.com/kyobankatu" target="_blank" rel="noreferrer">
                        <FaGithub size={20} className={styles.contactIcon} />
                        <span className={styles.contactLabel}>GitHub</span>
                        <span className={styles.contactValue}>kyobankatu</span>
                    </a>
                </div>
            </section>

            <section id="hobbies" className={styles.sectionPlaceholder}>
                <h2>Hobbies</h2>
                <p className={styles.hobbiesNote}>{t.hobbies.note1}</p>
                <p className={styles.hobbiesNote}>{t.hobbies.note2}</p>
                <div className={styles.hobbiesGallery}>
                    <img src="/hobbies/img0.jpg" alt="illust 0" className={styles.hobbiesImg} />
                    <img src="/hobbies/img1.jpg" alt="illust 1" className={styles.hobbiesImg} />
                </div>
            </section>
        </>
    )
}
