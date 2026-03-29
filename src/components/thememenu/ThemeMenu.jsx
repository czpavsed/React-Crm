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
            className="topnav__icon-btn"
            type="button"
            onClick={toggleMode}
            title={currMode === 'light' ? 'Přepnout na tmavý režim' : 'Přepnout na světlý režim'}
            aria-label={currMode === 'light' ? 'Přepnout na tmavý režim' : 'Přepnout na světlý režim'}
        >
            <i className={`bx ${currMode === 'light' ? 'bx-moon' : 'bx-sun'}`}></i>
        </button>
    )
}

export default ThemeMenu
