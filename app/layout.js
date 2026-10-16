import './globals.css'

export const metadata = {
    title: 'Katumon | Portfolio',
    description: 'Portfolio of Katumon, featuring research, projects, and technology.',
    icons: { icon: '/fav.png' },
}

export default function RootLayout({ children }) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    )
}
