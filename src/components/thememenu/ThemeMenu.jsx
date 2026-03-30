import React, { useEffect, useState } from 'react'

import './thememenu.css'

import { useDispatch } from 'react-redux'

import ThemeAction from '../../redux/actions/ThemeAction'

const mode_settings = {
    light: 'theme-mode-light',
    dark: 'theme-mode-dark'
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const getThemeStorageKey = (email) => {
    const normalized = normalizeEmail(email)
    return normalized ? `themeMode:${normalized}` : 'themeMode'
}

const MoonIcon = () => (
    <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M21 12.79A9 9 0 1 1 11.21 3c-.07.33-.11.67-.11 1.02A8.98 8.98 0 0 0 20 13c.35 0 .69-.04 1-.11z" />
    </svg>
)

const SunIcon = () => (
    <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
    </svg>
)

const ThemeMenu = ({ email }) => {
    const [currMode, setCurrMode] = useState('light')

    const dispatch = useDispatch()
    const storageKey = getThemeStorageKey(email)

    const toggleMode = () => {
        const nextMode = currMode === 'light' ? 'dark' : 'light'
        const nextClass = mode_settings[nextMode]
        setCurrMode(nextMode)
        localStorage.setItem(storageKey, nextClass)
        localStorage.setItem('themeMode', nextClass)
        dispatch(ThemeAction.setMode(nextClass))
    }

    useEffect(() => {
        const savedClass = localStorage.getItem(storageKey) || localStorage.getItem('themeMode') || mode_settings.light
        const initialMode = savedClass === mode_settings.dark ? 'dark' : 'light'

        setCurrMode(initialMode)
        dispatch(ThemeAction.setMode(mode_settings[initialMode]))
    }, [dispatch, storageKey])

    return (
        <button
            className="theme-toggle-btn"
            type="button"
            onClick={toggleMode}
            title={currMode === 'light' ? 'Přepnout na tmavý režim' : 'Přepnout na světlý režim'}
            aria-label={currMode === 'light' ? 'Přepnout na tmavý režim' : 'Přepnout na světlý režim'}
        >
            {currMode === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
    )
}

export default ThemeMenu
