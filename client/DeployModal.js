/* eslint-disable no-unused-vars */
import React, { useState } from 'camunda-modeler-plugin-helpers/react';
import { Modal } from 'camunda-modeler-plugin-helpers/components';

// polyfill upcoming structural components
const Title = Modal.Title || (({ children }) => <h2>{ children }</h2>);
const Body = Modal.Body || (({ children }) => <div>{ children }</div>);
const Footer = Modal.Footer || (({ children }) => <div>{ children }</div>);

import Dropzone from './Dropzone';

const path = require('path');

export default function DeployModal({ initValues, onClose }) {

  const [ inputFile, setInputFile ] = useState(initValues.inputFile);

  const [ amountOutputs, setAmountOutputs ] = useState(initValues.amountOutputs);
  const [ tableName, setTableName ] = useState(initValues.tableName);
  const [ hitPolicy, setHitPolicy ] = useState(initValues.hitPolicy);

  const [ chosenFileText, setChosenFileText ] = useState('No file selected.');

  const isValid = () => {
    return !!amountOutputs &&
      !!inputFile &&
      !!tableName &&
      !!hitPolicy;
  };

  const handleInputFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setTableName(getFileNameWithoutExtension(file));
    setInputFile(file);
    setChosenFileText(file.name);
  };

  const handleInputFileClick = (event) => {
    const realInput = document.getElementById('inputFile');
    realInput.click();
  };

  const handleSubmit = () => onClose({
    amountOutputs,
    inputFile,
    tableName,
    hitPolicy
  });

  const handleDrop = (files = []) => {
    if (!files.length) {
      return;
    }

    handleInputFileChange({
      target: { files }
    });
  };

  return <Modal onClose={ onClose }>
    <Dropzone onDrop={ handleDrop }>
      <Title>
         Deploy Diagram
      </Title>

      <Body>
        <form id="import-form" className="import-form" onSubmit={ handleSubmit }>

          <fieldset>

            <div className="fields">

              <div className="form-group">
                <label>Deployment Name</label>
                <input
                  type="text"
                  id="tableName"
                  className="form-control"
                  name="tableName"
                  placeholder="Input a name for your deployment."
                  value={ tableName }
                  onChange={ event => setTableName(event.target.value) } />
              </div>

              <div className="form-group">
                <label>Tenant ID</label>
                <input
                  type="text"
                  id="tenantId"
                  className="form-control"
                  name="tenantId"
                  placeholder="Optional"
                  value={ tableName }
                  onChange={ null } />
              </div>

              <legend>Endpoint Configuration</legend>

              <div className="form-group">
                <label>REST Endpoint</label>
                <input
                  type="text"
                  id="restEndpoint"
                  className="form-control"
                  name="restEndpoint"
                  placeholder="Input REST Endpoint."
                  value={ tableName }
                  onChange={ null } />
              </div>

              

            </div>
          </fieldset>
        </form>
      </Body>

      <Footer>
        <div className="import-buttons">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={ () => onClose() }>Cancel</button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={ !isValid() }
            form="import-form">Deploy</button>
        </div>
      </Footer>
    </Dropzone>
  </Modal>;
}


// helpers ////////////////////////

const getFileNameWithoutExtension = (file) => {
  return path.basename(file.path, '.xlsx');
};

const getDirectory = (file) => {
  return path.dirname(file.path) + '/';
};
