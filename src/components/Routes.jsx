import React from 'react'

import { Route, Switch } from 'react-router-dom'

import Dashboard from '../pages/Dashboard'
import Zakazky from '../pages/Zakazky'
import ZakazkaForm from '../pages/ZakazkaForm'
import Zakaznici from '../pages/Zakaznici'
import ZakaznikForm from '../pages/ZakaznikForm'

const Routes = ({ email }) => {
    return (
        <Switch>
            <Route path='/' exact render={() => <Dashboard email={email} />} />
            <Route path='/zakazky' exact render={() => <Zakazky email={email} />} />
            <Route path='/zakazky/nova' exact render={() => <ZakazkaForm email={email} />} />
            <Route path='/zakazky/:id' exact render={() => <ZakazkaForm email={email} />} />
            <Route path='/zakaznici' exact component={Zakaznici} />
            <Route path='/zakaznici/novy' exact component={ZakaznikForm} />
            <Route path='/zakaznici/:id' exact component={ZakaznikForm} />
        </Switch>
    )
}

export default Routes
