import React, { useEffect, useState } from 'react'

import './layout.css'

import Sidebar from '../sidebar/Sidebar'
import TopNav from '../topnav/TopNav'
import Routes from '../Routes'
import CrmAuthGate from '../auth/CrmAuthGate'

import { BrowserRouter, Route } from 'react-router-dom'

import { useSelector, useDispatch } from 'react-redux'

import ThemeAction from '../../redux/actions/ThemeAction'

const Layout = () => {

    const themeReducer = useSelector(state => state.ThemeReducer)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const dispatch = useDispatch()

    useEffect(() => {
        const themeClass = localStorage.getItem('themeMode') || 'theme-mode-light'
        const colorClass = 'theme-color-orange'

        localStorage.setItem('colorMode', colorClass)

        dispatch(ThemeAction.setMode(themeClass))

        dispatch(ThemeAction.setColor(colorClass))
    }, [dispatch])

    return (
        <CrmAuthGate>
            {({ email, signOut }) => (
                <BrowserRouter>
                    <Route render={(props) => (
                        <div className={`layout ${themeReducer.mode} ${themeReducer.color} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                            <Sidebar {...props} collapsed={sidebarCollapsed} />
                            <div className="layout__content">
                                <TopNav
                                    email={email}
                                    onSignOut={signOut}
                                    sidebarCollapsed={sidebarCollapsed}
                                    onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
                                />
                                <div className="layout__content-main">
                                    <Routes email={email} />
                                </div>
                            </div>
                        </div>
                    )}/>
                </BrowserRouter>
            )}
        </CrmAuthGate>
    )
}

export default Layout
