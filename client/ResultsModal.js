import React, { Fragment } from 'react'; // eslint-disable-line no-unused-vars
import { Modal } from 'camunda-modeler-plugin-helpers/components';
import { Formik, Form, Field, FieldArray } from 'formik';
import DecisionsDropdown from './DecisionsDropdown';


export default function ResultsModal(props) {
  const {
    closeModal,
    evaluation,
    displayInDiagram,
    initiallySelectedDecision,
    decisions
  } = props;

  const decisionTaken = initiallySelectedDecision;


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

  const updateDecision = value => {
    this.setState({ decisionTaken: value });
  };

  const handleSubmit = values => {
    this.props.evaluate({
      variables: values.variables,
      decision: this.state.decisionTaken
    });
  };

  const { error, results } = evaluation;
  const goBack = () => closeModal(true);
  const onClose = () => closeModal();
  const onDisplayDiagram = () => displayInDiagram();

  return (
    <Modal onClose={ onClose }>

      <Modal.Title>
        Test Results
      </Modal.Title>

      <Modal.Body>

        <div>
          <h3>Decision to evaluate</h3>
          <DecisionsDropdown
            selected={ decisionTaken }
            decisions={ decisions }
            onDecisionChanged={ updateDecision }
          />

          <h3>Variable inputs</h3>
          <Formik
            enableReinitialize
            initialValues={ initialValues }
            onSubmit={ handleSubmit }
          >
            {({ values }) => (
              <Form
                id="dmnTestingInputVarsForm">
                <FieldArray
                  name="variables"
                  render={ arrayHelpers => (
                    <div>
                      {values.variables && values.variables.length > 0 ? (
                        values.variables.map((_, index) => (
                          <div key={ index }>
                            <Field name={ `variables.${index}.decision` } disabled={ true } />
                            <Field name={ `variables.${index}.name` } />
                            <Field name={ `variables.${index}.value` } placeholder="<provide value>" />
                            <Field name={ `variables.${index}.type` } component="select">
                              <option value="">Select type</option>
                              <option value="string">string</option>
                              <option value="integer">integer</option>
                              <option value="boolean">boolean</option>
                              <option value="long">long</option>
                              <option value="double">double</option>
                              <option value="date">date</option>
                            </Field>
                            <button
                              type="button"
                              onClick={ () => arrayHelpers.remove(index) }
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={ () => arrayHelpers.insert(index + 1, '') }
                            >
                              +
                            </button>
                          </div>
                        ))
                      ) : (
                        <button type="button" onClick={ () => arrayHelpers.push('') }>
                          Add a variable
                        </button>
                      )}
                    </div>
                  ) }
                />
              </Form>
            )}
          </Formik>
        </div>
      </Modal.Body>

      <Modal.Body>

        {
          error ?
            <ErrorResults error={ error } /> :
            <SuccessResults results={ results } />
        }

      </Modal.Body>

      <Modal.Footer>
        <div>
          <button type="button" className="btn btn-secondary" onClick={ goBack }>Go back</button>
          <button type="button" className="btn btn-secondary" onClick={ goBack }>Save results</button>
          <button type="button" className="btn btn-primary" onClick={ onClose }>Close</button>
          <button type="button" className="btn btn-primary" onClick={ onDisplayDiagram }>Display in diagram</button>
        </div>
      </Modal.Footer>
    </Modal>

  );
}

function ErrorResults(props) {
  const { error } = props;

  return (
    <Fragment>
      <h3>
        Evaluation failed
      </h3>
      <div>
        { error.message }
      </div>
    </Fragment>
  );
}

function SuccessResults(props) {
  const { results } = props;

  const Results = () => (
    <ul>
      {
        results.map(decision => (
          <ol title={ 'id: ' + decision.id }>
            {decision.name}
            { decision.outputs.length ? (
              <ul>
                { decision.outputs.map(output => (
                  <ol title={ 'id: ' + output.id }>{output.name}: {output.values.join(', ')}</ol>
                )) }
              </ul>
            ) : null }
          </ol>
        ))
      }
    </ul>
  );

  return (
    <Fragment>
      <h3>
        Successfully evaluated decision
      </h3>
      <div>
        Results per decision:
        <Results />
      </div>
    </Fragment>
  );
}