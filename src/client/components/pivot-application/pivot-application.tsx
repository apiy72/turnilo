'use strict';
require('./pivot-application.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { List } from 'immutable';
import { DataSource } from "../../../common/models/index";

import { CubeHeaderBar } from '../cube-header-bar/cube-header-bar';
import { SideDrawer, SideDrawerProps } from '../side-drawer/side-drawer';
import { CubeView } from '../cube-view/cube-view';

import { HomeHeaderBar } from '../home-header-bar/home-header-bar';
import { HomeView } from '../home-view/home-view';

import { visualizations } from '../../visualizations/index';

export interface PivotApplicationProps extends React.Props<any> {
  version: string;
  dataSources: List<DataSource>;
  homeLink?: string;
  maxFilters?: number;
  maxSplits?: number;
  showLastUpdated?: boolean;
  hideGitHubIcon?: boolean;
  headerBackground?: string;
}

export interface PivotApplicationState {
  ReactCSSTransitionGroupAsync?: typeof ReactCSSTransitionGroup;
  SideDrawerAsync?: typeof SideDrawer;
  drawerOpen?: boolean;

  hash?: string;
  viewType?: string;
  dataSources?: List<DataSource>;
  selectedDataSource?: DataSource;
}

export const CUBE = "cube";
export class PivotApplication extends React.Component<PivotApplicationProps, PivotApplicationState> {
  private hashUpdating: boolean = false;

  constructor() {
    super();
    this.state = {
      ReactCSSTransitionGroupAsync: null,
      SideDrawerAsync: null,
      drawerOpen: false,
      hash: null,
      dataSources: null,
      selectedDataSource: null,
      viewType: null
    };
    this.globalHashChangeListener = this.globalHashChangeListener.bind(this);
  }

  componentWillMount() {
    var { dataSources } = this.props;
    if (!dataSources.size) throw new Error('must have data sources');
    this.setState({ dataSources });

    var selectedDataSource = dataSources.first();
    var hash = window.location.hash;

    var viewType = this.getViewTypeFromHash(hash);
    var hashDataSource = this.getDataSourceFromHash(dataSources, hash);
    if (hashDataSource && !hashDataSource.equals(selectedDataSource)) selectedDataSource = hashDataSource;
    this.setState({ viewType, hash, selectedDataSource });
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.globalHashChangeListener);

    require.ensure([
      'react-addons-css-transition-group',
      '../side-drawer/side-drawer'
    ], (require) => {
      this.setState({
        ReactCSSTransitionGroupAsync: require('react-addons-css-transition-group'),
        SideDrawerAsync: require('../side-drawer/side-drawer').SideDrawer
      });
    }, 'side-drawer');
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.globalHashChangeListener);
  }

  changeDataSource(dataSource: DataSource) {
    if (this.state.viewType !== CUBE) {
      this.setState({ viewType: CUBE });
    }
    if (!this.state.selectedDataSource.equals(dataSource)) {
      this.setState({ selectedDataSource: dataSource });
    }
  };

  globalHashChangeListener(): void {
    if (this.hashUpdating) return;
    var hash = window.location.hash;
    var viewType = this.getViewTypeFromHash(hash);
    if (viewType === CUBE) {
      var dataSource = this.getDataSourceFromHash(this.state.dataSources, hash);
      if (!dataSource) dataSource = this.props.dataSources.first();
      this.changeDataSource(dataSource);
      this.setState({ hash });
    }
    this.setState({ viewType });
    this.sideDrawerOpen(false);
  }

  getViewTypeFromHash(hash: string): string {
    return this.parseHash(hash).shift();
  }

  parseHash(hash: string): string[] {
    if (hash[0] === '#') hash = hash.substr(1);
    return hash.split('/');
  }

  getDataSourceFromHash(dataSources: List<DataSource>, hash: string): DataSource {
    // can change header from hash
    var parts = this.parseHash(hash);
    if (parts.length < 4) return null;
    var viewType = parts.shift();
    var dataSourceName = parts.shift();
    return dataSources.find((ds) => ds.name === dataSourceName);
  }

  sideDrawerOpen(drawerOpen: boolean): void {
    this.setState({ drawerOpen });
  }

  updateHash(property: string, newHash: string): void {
    var viewType = this.state.viewType;
    this.hashUpdating = true;
    if (viewType === CUBE) newHash = `/${this.state.selectedDataSource.name}${newHash}`;
    window.location.hash = "#" + viewType + newHash;
    // setTimeout(() => {
    this.hashUpdating = false;
    // }, 10);
  }

  render() {
    var { homeLink, maxFilters, maxSplits, showLastUpdated, hideGitHubIcon, headerBackground } = this.props;
    var { dataSources, hash, selectedDataSource, ReactCSSTransitionGroupAsync, drawerOpen, SideDrawerAsync } = this.state;

    var sideDrawer: JSX.Element = null;
    if (drawerOpen && SideDrawerAsync) {
      var closeSideDrawer: () => void = this.sideDrawerOpen.bind(this, false);
      sideDrawer = <SideDrawerAsync
        key='drawer'
        changeDataSource={this.changeDataSource.bind(this)}
        selectedDataSource={selectedDataSource}
        dataSources={this.state.dataSources}
        onClose={closeSideDrawer}
        homeLink={homeLink}
      />;
    }

    if (ReactCSSTransitionGroupAsync) {
      var sideDrawerTransition = <ReactCSSTransitionGroupAsync
        component="div"
        className="side-drawer-container"
        transitionName="side-drawer"
        transitionEnterTimeout={500}
        transitionLeaveTimeout={300}
      >
        {sideDrawer}
      </ReactCSSTransitionGroupAsync>;
    }
    var header: any = null;
    var view: JSX.Element = null;

    if (this.state.viewType === CUBE) {
      header = <CubeHeaderBar
        dataSource={selectedDataSource}
        onNavClick={this.sideDrawerOpen.bind(this, true)}
        showLastUpdated={showLastUpdated}
        hideGitHubIcon={hideGitHubIcon}
        color={headerBackground}
      />;
      view = <CubeView
        updateHash={this.updateHash.bind(this, CUBE)}
        selectedDataSource={selectedDataSource}
        hash={hash}
        maxFilters={maxFilters}
        maxSplits={maxSplits}
      />;

    } else {
      header = <HomeHeaderBar/>;
      view =
        <HomeView dataCubes={dataSources} selectDataCube={this.changeDataSource.bind(this)}/>;

    }

    return <main className='pivot-application'>
      {header}
      {view}
      {sideDrawerTransition}
    </main>;
  }
}
