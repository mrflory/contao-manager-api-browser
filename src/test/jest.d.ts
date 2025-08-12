/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      // Jest-dom matchers
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toBeDisabled(): R;
      toBeEmptyDOMElement(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      toHaveStyle(css: string): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | string[] | number): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      toHaveDescription(text?: string | RegExp): R;
      toBePartiallyChecked(): R;
      
      // Custom workflow matchers from customMatchers.ts
      toHaveWorkflowStatus(expectedStatus: string): R;
      toHaveStepWithStatus(stepId: string, expectedStatus: string): R;
      toHaveCompletedStep(stepId: string): R;
      toHaveActiveStep(stepId: string): R;
      toHaveErrorInStep(stepId: string, expectedError?: string): R;
      toBeAtStep(stepId: string): R;
      toHaveStepsInOrder(expectedOrder: string[]): R;
      toHavePendingMigrations(): R;
      toBeWorkflowComplete(): R;
    }
  }
}