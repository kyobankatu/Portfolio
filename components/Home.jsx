'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './Home.module.css'

const name = 'ぽぼりむ'
const role = '情報工学系 学生'
const tagline = '創造と実装で世界を形にする'
const skills = ['Vue', 'JavaScript', 'Python', 'Git']

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
            <section className={styles.selfInfo}>
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

                        <div className={styles.skillList}>
                            {skills.map((s) => (
                                <span key={s} className={styles.skill}>{s}</span>
                            ))}
                        </div>

                        <div className={styles.actions}>
                            <button className={`${styles.btn} ${styles.primary}`} onClick={() => scrollTo('projects')}>
                                Projects
                            </button>
                            <button className={`${styles.btn} ${styles.ghost}`} onClick={() => scrollTo('contact')}>
                                Contact
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section id="projects" className={styles.sectionPlaceholder}>
                <h2>Projects</h2>
                <p>ここにプロジェクト一覧を追加できます。</p>
            </section>

            <section id="contact" className={styles.sectionPlaceholder}>
                <h2>Contact</h2>
                <p>連絡先情報やフォームをここに置きます。</p>
            </section>
        </>
    )
}
