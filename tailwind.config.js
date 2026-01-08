/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./index.tsx",
        "./App.tsx",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    900: '#0f172a',
                    800: '#1e293b',
                    700: '#334155',
                    600: '#475569',
                    500: '#3b82f6',
                    400: '#60a5fa',
                    accent: '#8b5cf6',
                    success: '#10b981',
                    danger: '#ef4444',
                    warning: '#f59e0b'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    },
    plugins: [],
}
