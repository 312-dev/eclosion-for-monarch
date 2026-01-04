/**
 * WorkflowSteps - Animated step-by-step workflow guide
 *
 * Usage in MDX:
 * ```mdx
 * import { WorkflowSteps } from '@site/src/components/WorkflowSteps';
 *
 * <WorkflowSteps
 *   steps={[
 *     {
 *       title: "Select Add Item",
 *       description: "Click the Add Item button in the toolbar",
 *       image: "/img/steps/add-item.png"
 *     },
 *     {
 *       title: "Enter Details",
 *       description: "Fill in the expense name and amount",
 *       image: "/img/steps/enter-details.png"
 *     },
 *   ]}
 * />
 * ```
 */

import React, { useState } from 'react';

interface Step {
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Optional image for this step */
  image?: string;
}

interface WorkflowStepsProps {
  /** Array of workflow steps */
  steps: Step[];
  /** Optional title for the workflow */
  title?: string;
}

export function WorkflowSteps({ steps, title }: WorkflowStepsProps): JSX.Element {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div
      style={{
        margin: '1.5rem 0',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--ifm-color-emphasis-100)',
            borderBottom: '1px solid var(--ifm-color-emphasis-300)',
            fontWeight: 500,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Step indicators */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '1rem',
            borderBottom: '1px solid var(--ifm-color-emphasis-200)',
            overflowX: 'auto',
          }}
        >
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  activeStep === index
                    ? 'var(--ifm-color-primary)'
                    : 'var(--ifm-color-emphasis-200)',
                color:
                  activeStep === index
                    ? 'white'
                    : 'var(--ifm-color-emphasis-700)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor:
                    activeStep === index
                      ? 'rgba(255,255,255,0.2)'
                      : 'var(--ifm-color-emphasis-300)',
                  fontSize: '0.75rem',
                }}
              >
                {index + 1}
              </span>
              {step.title}
            </button>
          ))}
        </div>

        {/* Active step content */}
        <div style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--ifm-color-emphasis-800)',
              }}
            >
              {steps[activeStep].description}
            </p>
            {steps[activeStep].image && (
              <img
                src={steps[activeStep].image}
                alt={steps[activeStep].title}
                style={{
                  borderRadius: '6px',
                  border: '1px solid var(--ifm-color-emphasis-300)',
                  maxWidth: '100%',
                }}
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--ifm-color-emphasis-200)',
            backgroundColor: 'var(--ifm-color-emphasis-100)',
          }}
        >
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color:
                activeStep === 0
                  ? 'var(--ifm-color-emphasis-400)'
                  : 'var(--ifm-color-primary)',
              cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            ← Previous
          </button>
          <span
            style={{
              fontSize: '0.875rem',
              color: 'var(--ifm-color-emphasis-600)',
            }}
          >
            Step {activeStep + 1} of {steps.length}
          </span>
          <button
            onClick={() =>
              setActiveStep(Math.min(steps.length - 1, activeStep + 1))
            }
            disabled={activeStep === steps.length - 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color:
                activeStep === steps.length - 1
                  ? 'var(--ifm-color-emphasis-400)'
                  : 'var(--ifm-color-primary)',
              cursor:
                activeStep === steps.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkflowSteps;
