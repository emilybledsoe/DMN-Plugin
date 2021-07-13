/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

/* eslint-disable no-unused-vars*/
import React, { Fragment, PureComponent } from 'camunda-modeler-plugin-helpers/react';
import { Fill } from 'camunda-modeler-plugin-helpers/components';
import TestingModal from './TestingModal';
import { getInputVariables } from './InputVariableHelper';
import EngineAPI from './EngineAPI';
import ResultsModal from './ResultsModal';
import { map } from 'min-dash';

import { createResultsHighlighting } from './results-highlighting/ResultsHighlighting';

import ImportModal from './ImportModal';
import HIT_POLICIES from './helper/hitPolicies';

import {
  convertXlsxToDmn,
  convertDmnToXlsx,
  convertEmptyDmnToXlsx
} from '../converter';

const API_URL = 'http://localhost:3000/';

const PLUGIN_EVENT = 'excel-import-plugin:import';

const ENCODING_UTF8 = 'utf8';

const FILTER_XLSX = {
  name: 'Excel file',
  encoding: ENCODING_UTF8,
  extensions: [ 'xlsx' ]
};

const ENGINE_ENDPOINT = 'http://localhost:9999';


export default class Dropdown extends PureComponent {

  container = React.createRef();

  constructor(props) {
    super(props);

    this.modelersMap = new Map();

    this.state = {
      open: false,
      activeTab: null,
      modalOpen: false,
      decisions: null,
      evaluation: null,
      configOpen: false,
      amountOutputs: '1',
      inputFile: '',
      hitPolicy: 'Unique',
      tableName: '',
    };

    this.resultsHighlighting = createResultsHighlighting(this);
  }

  handleButtonClick = () => {
    this.setState((state) => {
      return {
        open: !state.open,
      };
    });
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (event) => {
    if (
      this.container.current &&
      !this.container.current.contains(event.target)
    ) {
      this.setState({
        open: false,
      });
    }
  };

  evaluateDmn = async ({ decision, variables }) => {
    const { activeTab } = this.state;
    const xml = activeTab.file.contents;

    const engineAPI = new EngineAPI(ENGINE_ENDPOINT);

    let evaluation;
    try {
      const rawResults = await engineAPI.evaluateDecision({ xml, decision, variables });
      const results = this.getResults(rawResults);

      evaluation = { results };
    } catch (error) {
      evaluation = { error };
    }

    this.setState({
      evaluation: evaluation
    });
  }

  // TODO @barmac: refactor
  getResults(rawResults) {
    const definitions = this.getDefinitions();
    const drg = definitions.get('drgElement');

    const results = map(rawResults, ({ rules }, decisionId) => {
      const businessObject = drg.find(({ id }) => id === decisionId);
      const {
        id,
        name,
        decisionLogic
      } = businessObject;

      const result = { id, name, outputs: [] };

      result.outputs = rules.map(rule => rule.outputs).flat();
      result.ruleId = rules.map(rule => rule.ruleId);

      const decisionOutputs = decisionLogic.get('output');
      const simpleOutputs = decisionOutputs.map(
        ({ id, name, expression }) => ({ id, name, expression, values: [] })
      );

      for (const output of result.outputs) {
        const [ id, value ] = Object.entries(output)[0];

        const actualOutput = simpleOutputs.find(o => o.id === id);
        actualOutput.values.push(value);
      }

      result.outputs = simpleOutputs;

      return result;
    });

    return results;
  }

  componentDidMount() {

    /**
    * The component props include everything the Application offers plugins,
    * which includes:
    * - config: save and retrieve information to the local configuration
    * - subscribe: hook into application events, like <tab.saved>, <app.activeTabChanged> ...
    * - triggerAction: execute editor actions, like <save>, <open-diagram> ...
    * - log: log information into the Log panel
    * - displayNotification: show notifications inside the application
    */

    document.addEventListener('mousedown', this.handleClickOutside);

    const {
      subscribe
    } = this.props;

    subscribe(PLUGIN_EVENT, () => {
      this.openModal();
    });

    // subscribe to the event when the active tab changed in the application
    subscribe('app.activeTabChanged', ({ activeTab }) => {
      this.setState({ activeTab });
    });

    subscribe('dmn.modeler.created', ({ modeler, tab }) => {
      if (this.modelersMap.has(tab)) {
        return;
      }

      this.modelersMap.set(tab, modeler);
    });
  }

  openModal = async () => {
    const tab = await this.saveActiveTab();

    // don't open modal if tab has not been saved
    if (!tab) {
      return;
    }

    const definitions = this.getDefinitions();
    const decisions = getInputVariables(definitions);

    this.setState({ modalOpen: true, decisions });
  }

  saveActiveTab() {
    const {
      triggerAction
    } = this.props;

    // trigger a tab save operation
    return triggerAction('save-tab', { tab: this.state.activeTab });
  }

  getDefinitions() {
    return this.getModeler().getDefinitions();
  }

  getModeler() {
    return this.modelersMap.get(this.state.activeTab);
  }

  getCurrentBodyRows() {
    return this.getModeler()._container.querySelectorAll('tbody tr');
  }

  closeResults = goBack => {
    if (goBack) {
      return this.setState({ evaluation: null });
    }

    // clear rule highlighting
    this.resultsHighlighting.clear();

    this.setState({
      evaluation: null,
      modalOpen: false
    });
  }

  highlightResults = () => {
    this.resultsHighlighting.highlightResults(this.state.evaluation.results);

    this.setState({
      modalOpen: false
    });
  }

  handleImportError(error) {
    const {
      displayNotification,
      log
    } = this.props;

    displayNotification({
      type: 'error',
      title: 'Excel import failed',
      content: 'See the log for further details.',
      duration: 10000
    });

    log({
      category: 'excel-import-error',
      message: error.message
    });
  }

  handleExportError(error) {
    const {
      displayNotification,
      log
    } = this.props;

    displayNotification({
      type: 'error',
      title: 'Excel export failed',
      content: 'See the log for further details.',
      duration: 10000
    });

    log({
      category: 'excel-export-error',
      message: error.message
    });
  }

  handleExportSuccess(exportPath, exportedDecisionTables) {
    const {
      displayNotification
    } = this.props;

    displayNotification({
      type: 'success',
      title: 'Export succeeded!',
      content: <ExportSuccess
        exportPath={ exportPath }
        exportedDecisionTables={ exportedDecisionTables } />,
      duration: 10000
    });
  }

  async handleFileImportSuccess(xml) {
    const {
      triggerAction,
      subscribe
    } = this.props;

    let tab;

    const hook = subscribe('dmn.modeler.created', (event) => {

      const { modeler } = event;

      modeler.once('import.parse.start', 5000, function() {
        return xml;
      });

      // make tab dirty after import finished
      modeler.once('import.done', function() {
        const commandStack = modeler.getActiveViewer().get('commandStack');

        setTimeout(function() {
          commandStack.registerHandler('excel.foo', NoopHandler);
          commandStack.execute('excel.foo');
        }, 300);
      });
    });

    tab = await triggerAction('create-dmn-diagram');

    // cancel subscription after tab is created
    hook.cancel();
  }

  async convertXlsx(options) {
    const {
      buffer,
      amountOutputs,
      tableName,
      hitPolicy,
      aggregation
    } = options;

    const xml = convertXlsxToDmn({
      buffer,
      amountOutputs,
      tableName,
      hitPolicy,
      aggregation
    });

    return xml;
  }

  async importExcelSheet(options) {
    const {
      _getGlobal
    } = this.props;

    const fileSystem = _getGlobal('fileSystem');

    const {
      inputFile,
      hitPolicy
    } = options;

    try {

      // (0) get correct hit policy (and aggregation)
      const hitPolicyDetails = toHitPolicy(hitPolicy);

      options = {
        ...options,
        ...hitPolicyDetails
      };

      // (1) get excel sheet contents
      const excelSheet = await fileSystem.readFile(inputFile.path, {
        encoding: false
      });

      const {
        contents
      } = excelSheet;

      // (2) convert to DMN 1.3
      // const xml2 = await this.convertXlsxFromApi(options);
      const xml = await this.convertXlsx({
        buffer: contents,
        ...options
      });

      // (3) open and save generated DMN 1.3 file
      return await this.handleFileImportSuccess(xml);

    } catch (error) {
      this.handleImportError(error);
    }
  }

  handleConfigClosed(importDetails) {
    this.setState({ excelModalOpen: false });

    if (!importDetails) {
      return;
    }

    this.importExcelSheet(importDetails);
  }

  excelOpenModal() {
    this.setState({ excelModalOpen: true });
  }

  async export() {
    const {
      activeTab
    } = this.state;

    const {
      _getGlobal,
      triggerAction
    } = this.props;

    try {

      // (0) save tab contents
      const savedTab = await triggerAction('save-tab', { tab: activeTab });

      const {
        file,
        name
      } = savedTab;

      // (1) ask user were to export the file
      const dialog = _getGlobal('dialog');

      const exportPath = await dialog.showSaveFileDialog({
        file,
        title: `Save ${name} as ...`,
        filters: [
          FILTER_XLSX
        ]
      });

      if (!exportPath) {
        return false;
      }

      // (2) convert DMN 1.3 file to xlsx
      const {
        contents,
        exportedDecisionTables
      } = await convertDmnToXlsx({
        xml: file.contents
      });

      // (3) save file on disk
      const fileSystem = _getGlobal('fileSystem');

      await fileSystem.writeFile(exportPath, {
        ...file,
        contents
      }, {
        ENCODING_UTF8,
        fileType: 'xlsx'
      });

      return this.handleExportSuccess(exportPath, exportedDecisionTables);
    } catch (error) {
      return this.handleExportError(error);
    }

  }

  async createFile() {
    const {
      activeTab
    } = this.state;

    const {
      _getGlobal,
      triggerAction
    } = this.props;

    try {

      // (0) save tab contents
      const savedTab = await triggerAction('save-tab', { tab: activeTab });

      const {
        file,
        name
      } = savedTab;

      // (1) ask user where to export the file
      const dialog = _getGlobal('dialog');

      const exportPath = await dialog.showSaveFileDialog({
        file,
        title: `Save ${name} as ...`,
        filters: [
          FILTER_XLSX
        ]
      });

      if (!exportPath) {
        return false;
      }

      // (2) convert DMN 1.3 file to xlsx
      const {
        contents,
        exportedDecisionTables
      } = await convertEmptyDmnToXlsx({
        xml: file.contents
      });

      // (3) save file on disk
      const fileSystem = _getGlobal('fileSystem');

      await fileSystem.writeFile(exportPath, {
        ...file,
        contents
      }, {
        ENCODING_UTF8,
        fileType: 'xlsx'
      });

      return this.handleExportSuccess(exportPath, exportedDecisionTables);
    } catch (error) {
      return this.handleExportError(error);
    }

  }

  render() {
    const {
      activeTab,
      inputFile,
      amountOutputs,
      tableName,
      hitPolicy,
      decisions,
      evaluation,
      modalOpen,
      excelModalOpen
    } = this.state;

    const initValues = {
      inputFile,
      amountOutputs,
      tableName,
      hitPolicy
    };

    return (activeTab && activeTab.type === 'dmn') ? <Fragment>
      { isDMN(activeTab) && (
        <Fill slot="toolbar" group="9_autoSave">
          <div className="container" ref={ this.container }>
            <button type="button" class="button" onClick={ this.handleButtonClick }>
              Optum DMN
            </button>
            {this.state.open && (
              <div class="dropdown">
                <ul>
                  <li class="row" onClick={ this.excelOpenModal.bind(this) }>Import from Excel</li>
                  <li class="row" onClick={ this.export.bind(this) }>Export to Excel</li>
                  <li class="row" onClick={ this.openModal }>Test DMN Row</li>
                  <li class="row" onClick={ this.createFile.bind(this) }>Create New Testing File</li>
                  <li class="row">View/Update DMN Tests</li>
                  <li class="row">Regression Test</li>
                  <li class="row">Deploy DMN</li>

                </ul>
              </div>
            )}
          </div>
        </Fill>
      )}
      {
        modalOpen && evaluation ? (
          <ResultsModal
            closeModal={ this.closeResults }
            evaluation={ evaluation }
            displayInDiagram={ this.highlightResults }
            initiallySelectedDecision={ decisions[0] }
            decisions={ decisions }
          />
        ) : modalOpen ? (
          <TestingModal
            closeModal={ () => this.setState({ modalOpen: false }) }
            decisions={ decisions }
            initiallySelectedDecision={ decisions[0] }
            evaluate={ this.evaluateDmn }
          />
        ) : this.state.excelModalOpen && (
          <ImportModal
            onClose={ this.handleConfigClosed.bind(this) }
            initValues={ initValues }
          />
        )
      }
    </Fragment> : null;
  }
}

// helpers ////////////////

const ExportSuccess = (props) => {
  const {
    exportedDecisionTables,
    exportPath
  } = props;

  return <div>
    <p>{exportedDecisionTables.length + ' Decision Table(s) were exported.'}</p>
    <p>{'Find your exported Excel file at "' + exportPath + '".'}</p>
  </div>;
};

const createImportRequestBody = (details) => {
  return JSON.stringify({
    inputColumns: details.inputColumns,
    outputColumns: details.outputColumns,
    inputFile: details.inputFile.path,
    outputFile: createOutputPath(details)
  });
};

const createOutputPath = (details) => {
  return details.outputDirectory + details.tableName + '.dmn';
};

const toHitPolicy = (rawValue) => {
  return HIT_POLICIES[rawValue];
};

const NoopHandler = function() {

  this.execute = function(ctx) {

  };

  this.revert = function(ctx) {

  };
};

const isDMN = (tab) => {
  return tab.type === 'dmn';
};
