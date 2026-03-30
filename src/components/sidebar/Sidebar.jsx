import React from 'react'

import { Link } from 'react-router-dom'

import './sidebar.css'

import logo from '../../assets/images/logo.png'

import sidebar_items from '../../assets/JsonData/sidebar_routes.json'

const SidebarItem = props => {

    const active = props.active ? 'active' : ''

    return (
        <div className="sidebar__item">
            <div className={`sidebar__item-inner ${active}`}>
                <i className={props.icon}></i>
                <span>
                    {props.title}
                </span>
            </div>
        </div>
    )
}

const Sidebar = props => {

    const activeItem = sidebar_items.findIndex(item => {
        if (item.route === '/') return props.location.pathname === '/'
        return props.location.pathname === item.route || props.location.pathname.startsWith(`${item.route}/`)
    })

    return (
        <div className={`sidebar ${props.collapsed ? 'sidebar--collapsed' : ''}`}>
            <div className="sidebar__logo">
                <img src={logo} alt="Derator logo" />
            </div>
            <div className="sidebar__menu">
                {
                    sidebar_items.map((item, index) => (
                        <Link to={item.route} key={index}>
                            <SidebarItem
                                title={item.display_name}
                                icon={item.icon}
                                active={index === activeItem}
                            />
                        </Link>
                    ))
                }
            </div>
            <div className="sidebar__footer">
                <button
                    className="sidebar__collapse-btn"
                    type="button"
                    onClick={() => props.onToggleCollapse && props.onToggleCollapse()}
                    title={props.collapsed ? 'Rozbalit menu' : 'Sbalit menu'}
                    aria-label={props.collapsed ? 'Rozbalit menu' : 'Sbalit menu'}
                >
                    <i className={`bx ${props.collapsed ? 'bx-chevrons-right' : 'bx-chevrons-left'}`}></i>
                    <span>{props.collapsed ? 'Rozbalit menu' : 'Sbalit menu'}</span>
                </button>
            </div>
        </div>
    )
}

export default Sidebar
