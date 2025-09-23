/** biome-ignore-all lint/a11y/useButtonType: <explanation> */

import {
  Actions,
  DockLocation,
  Layout,
  Model,
  type TabNode,
} from 'flexlayout-react';
import type React from 'react';
import { useState } from 'react';
import 'flexlayout-react/style/light.css';

// Position enum for panel placement
export enum Position {
  LEFT = 'left',
  RIGHT = 'right',
}

/**
 * Panel - represents a logical tabset (a container for tabs)
 */
class Panel {
  public id: string;
  public title: string;
  public position: Position;
  private tabs: Array<{
    id?: string;
    name: string;
    component: string;
    config?: any;
  }> = [];

  constructor(
    id: string,
    title: string,
    position: Position,
    tabs: Array<{ name: string; component: string; config?: any }> = [],
  ) {
    this.id = id;
    this.title = title;
    this.position = position;
    this.tabs = tabs.map((t, i) => ({ id: `${id}_tab_${i + 1}`, ...t }));
  }

  toJson() {
    return {
      type: 'tabset',
      id: this.id,
      name: this.title,
      children: this.tabs.map((t) => ({
        type: 'tab',
        id: t.id,
        name: t.name,
        component: t.component,
        config: t.config,
      })),
    };
  }
}

class LayoutManager {
  private model: Model;
  private panels: Map<string, Panel> = new Map();

  constructor(model: Model) {
    this.model = model;
  }

  getModel() {
    return this.model;
  }

  registerPanel(panel: Panel) {
    this.panels.set(panel.id, panel);
  }

  renderPanel(panelId: string) {
    const panel = this.panels.get(panelId);
    if (!panel) throw new Error(`Panel ${panelId} not registered`);

    const existing = this.model.getNodeById(panelId);
    if (existing) {
      const children = existing.getChildren();
      if (children?.length) {
        this.model.doAction(Actions.selectTab(children[0].getId()));
      }
      return;
    }

    const rootId = this.model.getRoot().getId();
    const tabsetJson = panel.toJson();
    const location =
      panel.position === Position.LEFT ? DockLocation.LEFT : DockLocation.RIGHT;
    const action = Actions.addNode(tabsetJson, rootId, location, -1, true);
    this.model.doAction(action);
  }
}

const json = {
  global: {},
  borders: [],
  layout: {
    type: 'row',
    children: [],
  },
};

// Panel instances with position
const panel1 = new Panel('tabset_1', 'Tabset 1', Position.LEFT, [
  { name: 'Initial A', component: 'tab1' },
]);
const panel2 = new Panel('tabset_2', 'Tabset 2', Position.RIGHT, [
  { name: 'Initial B', component: 'tab2' },
]);

const App: React.FC = () => {
  const [model, setModel] = useState<Model>(Model.fromJson(json));
  const [layoutManager] = useState(() => new LayoutManager(model));

  layoutManager.registerPanel(panel1);
  layoutManager.registerPanel(panel2);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    const props = node.getConfig?.() || {};
    switch (component) {
      case 'tab1':
        return <div style={{ padding: '16px' }}>Tab 1 Content</div>;
      case 'tab2':
        return <div style={{ padding: '16px' }}>Tab 2 Content</div>;
      case 'dynamic':
        return (
          <div style={{ padding: '16px' }}>Dynamic Tab: {props?.text}</div>
        );
      default:
        return <div style={{ padding: '16px' }}>Unknown Tab</div>;
    }
  };

  const addPanel1 = () => {
    layoutManager.renderPanel('tabset_1');
    setModel(Model.fromJson(layoutManager.getModel().toJson()));
  };

  const addPanel2 = () => {
    layoutManager.renderPanel('tabset_2');
    setModel(Model.fromJson(layoutManager.getModel().toJson()));
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '8px',
          background: '#f0f0f0',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button onClick={addPanel1}>Add tabset_1 (Left)</button>
        <button onClick={addPanel2}>Add tabset_2 (Right)</button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Layout
          model={model}
          factory={factory}
          onAction={(action: any) => {
            console.log(action);
            return action;
            // if (action.type === 'FlexLayout_DeleteTab') {
            //   const node = model.getNodeById(action.data.node);
            //   if (node && node instanceof TabNode) {
            //     layoutManager.closeTab(node);
            //   }
            // }
            // return action;
          }}
        />
      </div>
    </div>
  );
};

export default App;
