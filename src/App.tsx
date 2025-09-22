import React, { useState } from "react";
import { Layout, Model, TabNode, Actions, DockLocation } from "flexlayout-react";
import "flexlayout-react/style/light.css";

type TabInsertPosition = "start" | "end" | number; // number means index position

class LayoutManager {
  private model: Model;
  private history: Array<{
    type: "add" | "close";
    tab: any;
    tabsetId: string;
    position?: TabInsertPosition;
    location?: DockLocation;
    select?: boolean;
  }> = [];

  constructor(initialModel: Model) {
    this.model = initialModel;
  }

  getModel() {
    return this.model;
  }

  /**
   * Add a tab to a tabset
   * @param tabsetId id of the tabset node to add into
   * @param tabJson json for the new tab node (e.g. {type: 'tab', component: 'myComp'})
   * @param position 'start' | 'end' | number index to insert at
   * @param select whether to select the new tab
   */
  addTab(
    tabsetId: string,
    tabJson: any,
    position: TabInsertPosition = "end",
    select: boolean = true
  ) {
    const location = DockLocation.CENTER;
    let index: number;
    if (position === "start") {
      index = 0;
    } else if (position === "end") {
      index = -1;
    } else {
      index = position; // custom index
    }

    const action = Actions.addNode(tabJson, tabsetId, location, index, select);
    this.model.doAction(action);
    this.history.push({ type: "add", tab: tabJson, tabsetId, position, location, select });
  }

  closeTab(node: TabNode) {
    const tabsetId = node.getParent()?.getId() ?? "";
    const tabJson = node.toJson();
    this.model.doAction(Actions.deleteTab(node.getId()));
    this.history.push({ type: "close", tab: tabJson, tabsetId });
  }

  reopenLastClosedTab() {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const h = this.history[i];
      if (h.type === "close") {
        this.addTab(h.tabsetId, h.tab, "end", true);
        return;
      }
    }
  }
}

// JSON configuration for the layout
const json = {
  global: {},
  borders: [],
  layout: {
    type: "row",
    children: [
      {
        type: "tabset",
        id: "tabset_1",
        children: [
          {
            type: "tab",
            name: "Tab 1",
            component: "tab1"
          }
        ]
      },
      {
        type: "tabset",
        id: "tabset_2",
        children: [
          {
            type: "tab",
            name: "Tab 2",
            component: "tab2"
          }
        ]
      }
    ]
  }
};

const App: React.FC = () => {
  const [model, setModel] = useState<Model>(Model.fromJson(json));
  const [layoutManager] = useState(() => new LayoutManager(model));

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    const props = node.getConfig?.() || {};
    switch (component) {
      case "tab1":
        return <div style={{ padding: "16px" }}>Tab 1 Content</div>;
      case "tab2":
        return <div style={{ padding: "16px" }}>Tab 2 Content</div>;
      case "dynamic":
        return <div style={{ padding: "16px" }}>Dynamic Tab: {props?.text}</div>;
      default:
        return <div>Unknown Tab</div>;
    }
  };

  const addDynamicTab = (position: TabInsertPosition) => {
    layoutManager.addTab("tabset_1", {
      type: "tab",
      name: `New Tab ${Math.floor(Math.random() * 100)}`,
      component: "dynamic",
      config: { text: "Added dynamically" }
    }, position);
    setModel(Model.fromJson(layoutManager.getModel().toJson()));
  };

  const reopenTab = () => {
    layoutManager.reopenLastClosedTab();
    setModel(Model.fromJson(layoutManager.getModel().toJson()));
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px", background: "#f0f0f0", display: "flex", gap: "8px" }}>
        <button onClick={() => addDynamicTab("start")}>Add Tab at Start</button>
        <button onClick={() => addDynamicTab("end")}>Add Tab at End</button>
        <button onClick={() => addDynamicTab(1)}>Add Tab at Index 1</button>
        <button onClick={reopenTab}>Reopen Last Closed Tab</button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <Layout
          model={model}
          factory={factory}
          onAction={(action: any) => {
            if (action.type === "FlexLayout_DeleteTab") {
              const node = model.getNodeById(action.data.node);
              if (node && node instanceof TabNode) {
                layoutManager.closeTab(node);
              }
            }
            return action;
          }}
        />
      </div>
    </div>
  );
};

export default App;