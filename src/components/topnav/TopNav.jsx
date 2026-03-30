import React from 'react'

import './topnav.css'

import ThemeMenu from '../thememenu/ThemeMenu'

const Topnav = ({ email, onSignOut }) => {
    return (
        <div className='topnav'>
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
