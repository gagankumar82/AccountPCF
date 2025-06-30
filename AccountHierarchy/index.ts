import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import Main from "./components/Main";

export class AccountHierarchy
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private reactRoot: Root | null = null;

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.context = context;
    this.container = container;
  }

 public updateView(
  context: ComponentFramework.Context<IInputs>
): React.ReactElement {
  return React.createElement(Main, {
    context: this.context,                   // the PCF context
    jsonMapping: context.parameters.JsonMapping.raw || "{}"  // the JSON string
  });
}
  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    if (this.reactRoot) {
      this.reactRoot.unmount();
    }
  }
}
