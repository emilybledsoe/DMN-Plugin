import React from 'react'; // eslint-disable-line no-unused-vars
//import { Formik, Form, Field, FieldArray } from 'formik';
import DecisionsDropdown from './DecisionsDropdown';
import { Modal } from 'camunda-modeler-plugin-helpers/components';


// we can even use hooks to render into the application
export default class ConfigModal extends React.PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      decisionTaken: props.decisions[0]
    };
  }

  updateDecision = value => {
    this.setState({ decisionTaken: value });
  }

  handleSubmit = values => {
    this.props.evaluate({
      variables: values.variables,
      decision: this.state.decisionTaken
    });
  }

  render() {

    const {
      closeModal,
      decisions,
      initiallySelectedDecision
    } = this.props;

    const {
      decisionTaken = initiallySelectedDecision
    } = this.state;

    // flatten to make it easier to display and extend with own variables
    // TODO: get rid of nested loop
    const allInputVariables = decisions.flatMap(decision => {
      return decision.variables.map(variable => ({
        decision: decision.decision,
        decisionId: decision.decisionId,
        name: variable.expression,
        type: variable.type,
        value: ''
      }));
    });
    const allowedDecisions = [ decisionTaken.decisionId, ...decisionTaken.downstreamDecisions ];
    const filteredInputVariables = allInputVariables.filter(
      variable => allowedDecisions.includes(variable.decisionId)
    );
    const initialValues = { variables: filteredInputVariables };

    const onClose = () => closeModal();

    return (
      <Modal onClose={ onClose }>

        <Modal.Title>
          View/Update DMN Tests
        </Modal.Title>

        <Modal.Body>

          <div>
            <h3>Decision to evaluate</h3>
            <DecisionsDropdown
              selected={ decisionTaken }
              decisions={ decisions }
              onDecisionChanged={ this.updateDecision }
            />
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div id="autoSaveConfigButtons">
            <button type="button" className="btn btn-secondary" onClick={ () => onClose() }>Cancel</button>
            <button type="submit" className="btn btn-primary" form="dmnTestingInputVarsForm">View</button>
          </div>
        </Modal.Footer>
      </Modal>

    );
  }

}

