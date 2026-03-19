'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Home.module.css'

const name = 'ぽぼりむ'
const role = 'Institute of Science Tokyo'
const tagline = '睡眠？それはデプロイ後に。'
const skillGroups = [
    {
        category: 'Languages',
        skills: [
            { name: 'Java', level: 5 },
            { name: 'Python', level: 4 },
            { name: 'C', level: 4 },
            { name: 'MATLAB', level: 2 },
            { name: 'Scala', level: 1 },
            { name: 'Verilog-HDL', level: 1 },
        ],
    },
    {
        category: 'Web',
        skills: [
            { name: 'HTML/CSS', level: 4 },
            { name: 'JavaScript', level: 3 },
            { name: 'TypeScript', level: 3 },
            { name: 'Next.js', level: 3 },
            { name: 'React', level: 1 },
        ],
    },
    {
        category: 'Database',
        skills: [
            { name: 'SQL', level: 3 },
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
        category: 'Life Skills',
        skills: [
            { name: 'GenshinImpact', level: 5 },
        ],
    },
]

const projects = [
    {
        name: 'PainRecorder',
        description: '慢性疼痛患者が痛みの強さを記録・可視化する日本語WebアプリをNext.js + PostgreSQLで構築。気象データ連携・PWA対応・グラフ分析機能を備えます。',
        techs: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Docker', 'Cloud Run'],
        github: 'https://github.com/kyobankatu/PainRecorder',
        url: 'https://painrecorder-474392225909.asia-northeast1.run.app/',
    },
    {
        name: 'ZZZ-Translator',
        description: '「Zenless Zone Zero」の用語集をWiki・XMLなど4ソースから収集・統合し、Google Cloud Translation APIのカスタム用語集として登録するPythonツールセット。Gemini APIによるAIクリーニング機能付き。',
        techs: ['Python', 'Playwright', 'Google Cloud Translation API', 'BeautifulSoup4'],
        github: 'https://github.com/kyobankatu/ZZZ-Translator',
        url: null,
    },
    {
        name: 'ZZZ-SearchApi',
        description: '「Zenless Zone Zero」のWiki情報を検索・スクレイピングし、OpenRouter経由のAIで要約して返すREST APIサーバー。ハイブリッド検索とカテゴリ別フォーマット出力に対応。',
        techs: ['Python', 'Flask', 'Google Cloud Translation API', 'BeautifulSoup4', 'Docker', 'Cloud Run'],
        github: 'https://github.com/kyobankatu/ZZZ-SearchApi',
        url: null,
    },
    {
        name: 'ZZZ-SearchOverlay',
        description: '「Zenless Zone Zero」のプレイ中にゲーム用語を素早く調べられるElectronデスクトップオーバーレイ。テキスト検索とスクリーンショットOCRによるエリアスキャンに対応。',
        techs: ['Electron', 'Node.js'],
        github: 'https://github.com/kyobankatu/ZZZ-SearchOverlay',
        url: null,
    },
    {
        name: 'GenshinImpactDPSCalculator',
        description: 'Genshin Impactの時間駆動型戦闘シミュレーターとDPS計算ツール。スキルアニメーション・元素反応・ICDを精密に再現し、アーティファクト最適化パイプラインとRL学習モジュールを備えます。',
        techs: ['Java', 'Gradle', 'Python'],
        github: 'https://github.com/kyobankatu/GenshinImpactDPSCalculator',
        url: 'https://kyobankatu.github.io/GenshinImpactDPSCalculator/simulation_report.html',
    },
    {
        name: 'ArtifactSimulator',
        description: '原神の聖遺物強化後のスコア確率分布を計算・可視化するWebアプリ。スクリーンショットからサブオプションを自動認識し、ヒストグラムや統計量で結果を表示。',
        techs: ['Vue.js', 'Vercel'],
        github: 'https://github.com/kyobankatu/ArtifactSimulator-Vercel',
        url: 'https://artifact-simulator.vercel.app/',
    },
    {
        name: 'ArtifactSimulator-Backend',
        description: '原神の聖遺物強化シミュレーター用バックエンドAPI。Google Cloud Vision APIによるOCRでスクリーンショットを解析し、強化後のスコア分布・統計情報を返します。',
        techs: ['Python', 'Flask', 'Google Cloud Vision API', 'Docker', 'Render'],
        github: 'https://github.com/kyobankatu/Render-Docker',
        url: null,
    },
    {
        name: 'NeuralNetwork',
        description: 'C言語でスクラッチ実装したニューラルネットワーク。逆誤差伝播法による学習を行い、sin波の近似を検証。結果をJupyter Notebookで可視化します。',
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
                            <h3>{name}</h3>
                        </div>
                    </div>

                    <div className={styles.selfContent}>
                        <div className={styles.eyebrow}>Portfolio</div>
                        <h1 className={styles.heroTitle}>
                            {name}
                            <span className={styles.gold}> — </span>
                            <span className={styles.role}>{role}</span>
                        </h1>
                        <p className={styles.tagline}>{tagline}</p>

                        <div className={styles.actions}>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('skills')}>
                                Skills
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('projects')}>
                                Projects
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('contact')}>
                                Contact
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
                                        <span className={styles.skillLevel}>
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <span
                                                    key={i}
                                                    className={i <= s.level ? styles.dotFilled : styles.dotEmpty}
                                                />
                                            ))}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
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
                            <p className={styles.projectDesc}>{p.description}</p>
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
                    <a className={styles.contactCard} href="mailto:ota.k.5051@m.isct.ac.jp">
                        <span className={styles.contactLabel}>Email</span>
                        <span className={styles.contactValue}>ota.k.5051@m.isct.ac.jp</span>
                    </a>
                    <a className={styles.contactCard} href="https://www.linkedin.com/in/kento-ota-84bb6a382" target="_blank" rel="noreferrer">
                        <span className={styles.contactLabel}>LinkedIn</span>
                        <span className={styles.contactValue}>kento-ota-84bb6a382</span>
                    </a>
                </div>
            </section>
        </>
    )
}
