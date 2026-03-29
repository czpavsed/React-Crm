import React from 'react'

import './topnav.css'

import ThemeMenu from '../thememenu/ThemeMenu'

const Topnav = ({ email, onSignOut, sidebarCollapsed, onToggleSidebar }) => {
    return (
        <div className='topnav'>
            <div className="topnav__search">
                <button
                    className="topnav__icon-btn topnav__sidebar-toggle"
                    type="button"
                    onClick={() => onToggleSidebar && onToggleSidebar()}
                    title={sidebarCollapsed ? 'Rozbalit menu' : 'Sbalit menu'}
                    aria-label={sidebarCollapsed ? 'Rozbalit menu' : 'Sbalit menu'}
                >
                    <i className={`bx ${sidebarCollapsed ? 'bx-chevrons-right' : 'bx-chevrons-left'}`}></i>
                </button>
                <input type="text" readOnly value='CRM Derator s.r.o.' />
                <i className='bx bx-shield-quarter'></i>
            </div>
            <div className="topnav__right">
                <div className="topnav__right-item">
                    <div className="topnav__right-user">
                        <div className="topnav__right-user__name">
                            {email || 'Přihlášený uživatel'}
                        </div>
                    </div>
                </div>
                <div className="topnav__right-item">
                    <ThemeMenu email={email} />
                </div>
                <div className="topnav__right-item">
                    <button className="topnav__logout" type="button" onClick={() => onSignOut && onSignOut()}>
                        <i className='bx bx-log-out'></i>
                        Odhlásit
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Topnav
