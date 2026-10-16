'use client'

import { useEffect, useState } from 'react'
import { FaEnvelope, FaGithub, FaLinkedin } from 'react-icons/fa'
import styles from './Home.module.css'
import { getProjectCards, resolveActiveSection, skillGroups } from './portfolioContent.js'
import en from '../locales/en.json'
import ja from '../locales/ja.json'

const navigation = [
    { id: 'profile', number: '01' },
    { id: 'research', number: '02' },
    { id: 'missions', number: '03' },
    { id: 'equipment', number: '04' },
    { id: 'interests', number: '05' },
    { id: 'contact', number: '06' },
]

export default function Home({ translations = { ja, en } }) {
    const [lang, setLang] = useState('ja')
    const [activeSection, setActiveSection] = useState('profile')
    const t = lang === 'ja' ? translations.ja : translations.en
    const projects = getProjectCards(t)
    const selectSection = (sectionId) => setActiveSection((current) => resolveActiveSection(sectionId, current))

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    useEffect(() => {
        const syncSectionFromHash = () => {
            const sectionId = window.location.hash.slice(1)
            if (sectionId === '') {
                setActiveSection('profile')
                return
            }

            setActiveSection((current) => resolveActiveSection(sectionId, current))
        }

        syncSectionFromHash()
        window.addEventListener('hashchange', syncSectionFromHash)
        return () => window.removeEventListener('hashchange', syncSectionFromHash)
    }, [])
    const swallowUrl = lang === 'ja'
        ? 'https://swallow-llm.github.io/index.ja.html'
        : 'https://swallow-llm.github.io/index.en.html'

    return (
        <div className={styles.portfolioShell}>
            <aside className={styles.sidebar} aria-label={t.sidebarLabel}>
                <a className={styles.brand} href="#overview" onClick={() => selectSection('profile')}>
                    <span className={styles.avatarFrame}><img src="/avatar-placeholder.png" alt="" /></span>
                    <span className={styles.brandText}>
                        <strong>{t.name}</strong>
                        <span>PLAYER 01 / ONLINE</span>
                    </span>
                </a>

                <div className={styles.saveCard}>
                    <span className={styles.cardLabel}>{t.currentSave}</span>
                    <p>{t.bio}</p>
                </div>

                <nav className={styles.navigation} aria-label={t.navigationLabel}>
                    {navigation.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={activeSection === item.id ? styles.navLinkActive : styles.navLink}
                            aria-current={activeSection === item.id ? 'location' : undefined}
                            onClick={() => selectSection(item.id)}
                        >
                            <span>{t.sections[item.id]}</span>
                            <span className={styles.navNumber}>{item.number}</span>
                        </a>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span className={styles.statusDot} />
                    <span>{t.readyStatus}</span>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.topbar}>
                    <span className={styles.breadcrumb}>PORTFOLIO <span>/</span> PERSONAL ARCADE</span>
                    <div className={styles.topbarActions}>
                        <span className={styles.statusLabel}><span className={styles.statusDot} /> {t.readyStatus}</span>
                        <button
                            type="button"
                            className={styles.langToggle}
                            onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
                            aria-label={lang === 'ja' ? 'Switch language to English' : '日本語に切り替え'}
                        >
                            {lang === 'ja' ? 'EN' : 'JA'}
                        </button>
                    </div>
                </header>

                <section id="overview" className={styles.hero} aria-labelledby="hero-title">
                    <div className={styles.heroCopy}>
                        <p className={styles.eyebrow}>{t.heroEyebrow}</p>
                        <h1 id="hero-title">{t.name}<span className={styles.nameMark}>.</span></h1>
                        <p className={styles.heroSummary}>{t.tagline}</p>
                        <div className={styles.heroActions}>
                            <a className={styles.primaryButton} href="#missions" onClick={() => selectSection('missions')}>
                                {t.viewMissions}<span aria-hidden="true">↗</span>
                            </a>
                            <a className={styles.secondaryButton} href="https://github.com/kyobankatu" target="_blank" rel="noreferrer">
                                GitHub <span aria-hidden="true">↗</span>
                            </a>
                        </div>
                    </div>

                    <div className={styles.characterStage} aria-label={t.characterStageLabel}>
                        <div className={styles.stageGrid} aria-hidden="true" />
                        <div className={styles.stageReadout}>
                            <span>PLAYER 01</span>
                            <span>{t.readyStatus}</span>
                        </div>
                        <p className={styles.stageMessage} role="status" aria-live="polite" aria-atomic="true">{t.characterLines[activeSection]}</p>
                        <div className={styles.characterTile} key={`character-${activeSection}`}><img src="/avatar-placeholder.png" alt={t.characterAlt} /></div>
                        <div className={styles.stageFloor} aria-hidden="true" />
                    </div>
                </section>

                <section id="profile" className={styles.contentSection} aria-labelledby="profile-heading">
                    <div className={styles.sectionHeading}>
                        <div className={styles.headingTitle}><span>01</span><h2 id="profile-heading">Profile</h2></div>
                        <p>{t.sectionNotes.profile}</p>
                    </div>
                    <div className={styles.profileGrid}>
                        <article className={styles.infoCard}><span className={styles.cardLabel}>{t.profileFields.education}</span><strong>{t.role}</strong></article>
                        <article className={styles.infoCard}><span className={styles.cardLabel}>{t.profileFields.lab}</span><strong>{t.research.labName}</strong></article>
                        <article className={styles.infoCard}><span className={styles.cardLabel}>{t.profileFields.interest}</span><strong>{t.interestSummary}</strong></article>
                    </div>
                </section>

                <section id="research" className={styles.contentSection} aria-labelledby="research-heading">
                    <div className={styles.sectionHeading}>
                        <div className={styles.headingTitle}><span>02</span><h2 id="research-heading">Research</h2></div>
                        <p>{t.sectionNotes.research}</p>
                    </div>
                    <div className={styles.researchPanel}>
                        <article className={styles.researchTopic}><span className={styles.cardLabel}>01 / {t.research.eventCameraLabel}</span><h3>{t.research.eventCamera}</h3></article>
                        <article className={styles.researchTopic}>
                            <span className={styles.cardLabel}>02 / LLM</span>
                            <h3>{t.research.llm}</h3>
                            <a className={styles.textLink} href={swallowUrl} target="_blank" rel="noreferrer">Swallow LLM <span aria-hidden="true">↗</span></a>
                        </article>
                    </div>
                </section>

                <section id="missions" className={styles.contentSection} aria-labelledby="missions-heading">
                    <div className={styles.sectionHeading}>
                        <div className={styles.headingTitle}><span>03</span><h2 id="missions-heading">Missions</h2></div>
                        <p>{t.sectionNotes.missions}</p>
                    </div>
                    <div className={styles.projectList}>
                        {projects.map((project, index) => (
                            <article className={styles.projectCard} key={project.key}>
                                <span className={styles.projectNumber}>M-{String(index + 1).padStart(2, '0')}</span>
                                <div className={styles.projectBody}>
                                    <span className={styles.cardLabel}>{project.kind}</span>
                                    <h3>{project.key}</h3>
                                    <p>{project.description}</p>
                                    <div className={styles.techList}>{project.techs.map((tech) => <span className={styles.techTag} key={tech}>{tech}</span>)}</div>
                                </div>
                                <div className={styles.projectLinks}>
                                    <a href={project.github} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
                                    {project.url && <a href={project.url} target="_blank" rel="noreferrer">{t.liveLink} <span aria-hidden="true">↗</span></a>}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="equipment" className={styles.contentSection} aria-labelledby="equipment-heading">
                    <div className={styles.sectionHeading}>
                        <div className={styles.headingTitle}><span>04</span><h2 id="equipment-heading">Equipment</h2></div>
                        <p>{t.sectionNotes.equipment}</p>
                    </div>
                    <div className={styles.skillsGrid}>
                        {skillGroups.map((group) => (
                            <article className={styles.skillGroup} key={group.category}>
                                <h3>{group.category}</h3>
                                <div className={styles.skillList}>{group.skills.map((skill) => <span className={styles.skillTag} key={skill}>{skill}</span>)}</div>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="interests" className={styles.contentSection} aria-labelledby="interests-heading">
                    <div className={styles.sectionHeading}>
                        <div className={styles.headingTitle}><span>05</span><h2 id="interests-heading">Interests</h2></div>
                        <p>{t.sectionNotes.interests}</p>
                    </div>
                    <div className={styles.interestPanel}><span className={styles.interestIcon} aria-hidden="true">▧</span><p>{t.interestDescription}</p></div>
                </section>

                <section id="contact" className={styles.contentSection} aria-labelledby="contact-heading">
                    <div className={styles.sectionHeading}>
                        <div className={styles.headingTitle}><span>06</span><h2 id="contact-heading">Contact</h2></div>
                        <p>{t.sectionNotes.contact}</p>
                    </div>
                    <div className={styles.contactList}>
                        <a href="mailto:kento.ota@rio.scrc.iir.isct.ac.jp" className={styles.contactLink}><FaEnvelope aria-hidden="true" /><span>Email</span><strong>kento.ota@rio.scrc.iir.isct.ac.jp</strong><span aria-hidden="true">↗</span></a>
                        <a href="https://www.linkedin.com/in/kento-ota-84bb6a382" target="_blank" rel="noreferrer" className={styles.contactLink}><FaLinkedin aria-hidden="true" /><span>LinkedIn</span><strong>kento-ota-84bb6a382</strong><span aria-hidden="true">↗</span></a>
                        <a href="https://github.com/kyobankatu" target="_blank" rel="noreferrer" className={styles.contactLink}><FaGithub aria-hidden="true" /><span>GitHub</span><strong>kyobankatu</strong><span aria-hidden="true">↗</span></a>
                    </div>
                </section>

                <footer className={styles.pageFooter}><span>© 2026 KATUMON</span><span>{t.footerNote}</span></footer>
            </main>
        </div>
    )
}
