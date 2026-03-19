import './globals.css'

export const metadata = {
    title: 'Portfolio',
    description: 'ぽぼりむのポートフォリオ',
}

export default function RootLayout({ children }) {
    return (
        <html lang="ja">
            <body suppressHydrationWarning>{children}</body>
        </html>
    )
}
