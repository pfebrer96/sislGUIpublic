import React, { Component } from 'react'

import _ from "lodash"

//--Components
import ReactTooltip from "react-tooltip"
import PlotDashboard from '../components/plots/PlotDashboard';

//--Python api 
import PythonApi from '../apis/PythonApi'

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css'

//--Redux
import { connect } from 'react-redux'
import {addPlots, setNewStructures, setActiveTab, setActivePlot, setSessionTabs, setCurrentSession, setNewPlotables, setActivePage} from "../redux/actions"
import StructurePicker from '../components/structures/StructurePicker'
import PlotInitializer from '../components/plotInitializer/PlotInitializer'
import LoadingTracker from '../components/loading/LoadingTracker'
import Tabs from '../components/tabs/Tabs'
import Controls from '../components/controls/Controls'
import PlotTweaking from './PlotTweaking'
import Settings from './Settings'

import {getApplicationKeyMap, GlobalHotKeys, configure} from 'react-hotkeys'
import { GLOBAL_HOT_KEYS, ADDITIONAL_GLOBAL_HOT_KEYS } from '../utils/hotkeys';
import PlotMethods from './PlotMethods';
import FilesInput from '../components/settings/inputFields/Files';
import ConnectionStatus from '../components/controls/ConnectionStatus';
import MoleculeViewer from '../components/structureView/MoleculeViewer';
import PlotEditor from './PlotEditor';

configure({logLevel: "debug", simulateMissingKeyPressEvents: false})
class Plots extends Component {

    constructor(props){
        super(props)

        this.state = {
            displayPlotInitializer: false,
            plotToInitialize: {
                struct: false,
                animation: false
            },
            loadingPlots: [],
            plotOptions:[]
        }

        document.addEventListener("syncWithSession", (e) => this.syncWithSession(e.detail.session) )

        document.addEventListener("updateTabs", () => this.syncWithSession())

        document.addEventListener("loadingPlot", (e) => {
            this.setState({ loadingPlots: [...this.state.loadingPlots, e.detail.plot_id] })
        })

        document.addEventListener("plot", (e) => {
            const plot = e.detail.plot
            props.addPlots({ [plot.id]: plot })
            this.setState({ loadingPlots: this.state.loadingPlots.filter(id => id != plot.id) })
        })

        document.addEventListener("newPlot", () => this.syncWithSession())

        document.addEventListener("sessionUpdate", (e) => {
            e.detail.justUpdated.forEach( plotID => {
                
                PythonApi.getPlot(plotID)

            })

        })
            
    }

    hotKeysHandlers = {
        GO_TO_SETTINGS: () => this.props.setActivePage("settings"),
        GO_TO_DASHBOARD: () => this.props.setActivePage("plots"),
        GO_TO_MOLECULEVIEWER: () => this.props.setActivePage("moleculeViewer"),
        SHOW_AVAIL_HOTKEYS: () => console.warn(getApplicationKeyMap())
    }

    syncWithSession = (session) => {

        if (!session) {
            return PythonApi.askForSession()
        }
        
        this.props.setCurrentSession(session)
        
    }

    componentDidMount(){

        this.props.setActivePlot(undefined)

        //Add the listener to display or not the plot initializer
        this.listener = document.addEventListener("togglePlotInitializer", this.togglePlotInitializer)

    }

    componentDidUpdate(){

        let activeTab = _.find(this.props.tabs, ["id", this.props.active.tab]) 
        
        if (!activeTab) return

        //Get the missing plots if there are any
        activeTab.plots.forEach(plotID => {

            if ( !this.props.plots[plotID] && this.state.loadingPlots.indexOf(plotID) == -1){

                PythonApi.getPlot(plotID)
                
            }
        })

    }

    getNewPlot = () => {

        PythonApi.newPlot({tabID: this.props.active.tab, ...this.state.plotToInitialize})
        
        this.togglePlotInitializer()

    }

    togglePlotInitializer = (e) => {

        let currentlyShowing = this.props.active.page == "plotInitializer"

        if (e != undefined & e.detail != undefined) {
            if (e.detail.forceShow &&  !currentlyShowing){
                this.props.setActivePage("plotInitializer")
            } if (e.detail.forceHide && currentlyShowing){
                this.props.setActivePage("plots")
            }
        } else {
            this.props.setActivePage(currentlyShowing ? "plots" : "plotInitializer")
        }

    }

    render() {

        const MainComponent = {
            'plots': PlotDashboard,
            'settings': Settings,
            'plotLayoutEditor': PlotEditor,
            'plotTweaking': PlotTweaking,
            'plotMethods': PlotMethods,
            'plotInitializer': PlotInitializer,
            'moleculeViewer': MoleculeViewer,
        }[this.props.active.page]

        if(this.props.active.page == 'plotLayoutEditor') {
            return (
                <div style={{ marginBottom: 0, display: "flex", flexWrap: "wrap", height: "100vh", position: "relative"}}>
                    <GlobalHotKeys keyMap={{ ...GLOBAL_HOT_KEYS }} handlers={this.hotKeysHandlers} />
                    <MainComponent />
                    <Controls style={{position: "absolute", bottom: 0, right: 0}}/>
                    <ToastContainer />
                    <ConnectionStatus
                        connectedProps={{ style: { backgroundColor: "lightgreen" } }}
                        style={{ position: "absolute", right: 0, top: 0, margin: 20, width: 40, height: 40, borderRadius: 40, display: "flex", justifyContent: "center", alignItems: "center" }} />
                    <ReactTooltip multiline disable={this.props.session.settings ? !this.props.session.settings.showTooltips : false} />
                </div>
            )
        }

        return (
            <div style={{marginBottom: 0, display: "flex", flexWrap: "wrap"}}>
                <GlobalHotKeys keyMap={{...GLOBAL_HOT_KEYS}} handlers={this.hotKeysHandlers}/>
                <div style={{marginLeft: 15, marginRight: 15, width: "10vw", minWidth: 150}}>
                    <StructurePicker/>   
                </div>
                <div style={{flex: 1, height: "100vh", display: "flex", flexDirection: "column"}}>
                    <LoadingTracker/>
                    {this.props.active.page == "plots" ? <Tabs /> : null}
                    <MainComponent style={{flex: 1}}/>
                    <FilesInput/>
                </div>
                <Controls />
                <ToastContainer/>
                <ConnectionStatus 
                connectedProps={{ style: {backgroundColor: "lightgreen"}}}
                style={{ position: "absolute", right: 0, top: 0, margin: 20, width:40, height: 40, borderRadius: 40, display: "flex", justifyContent: "center", alignItems: "center"}}/>
                <ReactTooltip multiline disable={this.props.session.settings ? !this.props.session.settings.showTooltips : false}/>
            </div>
        )
    }
}

const mapStateToProps = state => ({
    plots: state.plots,
    structures: state.session.structures,
    tabs: state.session.tabs,
    active: state.active,
    session: state.session
})

const mapDispatchToProps = {
    setCurrentSession,
    setActiveTab,
    setSessionTabs,
    setActivePlot,
    addPlots,
    setNewStructures,
    setNewPlotables,
    setActivePage
}

export default connect(mapStateToProps, mapDispatchToProps)(Plots);