import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Main from './components/Main';

export class AccountHierarchy
  implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
  private container?: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged?: () => void;

  /** Empty constructor. */
  constructor() {}

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.context = context;
    this.notifyOutputChanged = notifyOutputChanged;
    this.context.mode.trackContainerResize(true);
    this.container = container;
  }

  public updateView(
    _context: ComponentFramework.Context<IInputs>
  ): React.ReactElement {
    // Render the React tree into the PCF container
    return React.createElement(Main, {
      context: this.context,
      jsonMapping: this.context.parameters.JsonMapping.raw!,
    });
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    if (this.container) {
      ReactDOM.unmountComponentAtNode(this.container);
    }
  }
}
