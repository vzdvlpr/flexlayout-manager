/** biome-ignore-all lint/a11y/useButtonType: <explanation> */

import {
  Actions,
  DockLocation,
  I18nLabel,
  IJsonModel,
  IJsonTabNode, // todo typings for tab
  Layout,
  Model,
  type TabNode,
} from 'flexlayout-react';
import type React from 'react';
import { useEffect, useState } from 'react';
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
      selected: 0,
      children: this.tabs.map((t) => {
        return {
          type: 'tab',
          id: t.id,
          name: t.name,
          component: t.component,
          config: t.config,
        };
      }),
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

    // If the tabset already exists, just select its first tab
    // const existing = this.model.getNodeById(panelId);
    // if (existing) {
    //   const children = existing.getChildren?.();
    //   if (children?.length)
    //     this.model.doAction(Actions.selectTab(children[0].getId()));
    //   return;
    // }

    const rootId = this.model.getRoot().getId();
    const side =
      panel.position === Position.LEFT ? DockLocation.LEFT : DockLocation.RIGHT;

    // Use the panel’s tab definitions
    const tabsetSpec = panel.toJson();
    const { children, id: _, ...restTabsetAttributes } = tabsetSpec;
    const [first, ...rest] = children; // first is {type:'tab', id, name, component, ...}

    // 1) Add first tab to the side — FlexLayout will create a new tabset for it
    this.model.doAction(Actions.addNode({ ...first }, rootId, side, -1, true));

    // 2) Find the created tabset (parent of the first tab)
    const firstTab = this.model.getNodeById(first.id);
    const newTabset = firstTab?.getParent?.();

    newTabset?.updateAttrs({
      ...restTabsetAttributes,
      weight: 111,
      enableClose: true,
    });

    const newTabsetId = newTabset?.getId?.();

    // 3) Add remaining tabs into that tabset
    if (newTabsetId && rest.length) {
      for (const t of rest) {
        this.model.doAction(
          Actions.addNode(t, newTabsetId, DockLocation.CENTER, -1, false),
        );
      }
    }

    // Optional: select the first tab again
    if (firstTab) this.model.doAction(Actions.selectTab(first.id));
  }
}

const json = {
  global: {},
  borders: [],
  layout: {
    type: 'row',
    children: [
      {
        type: 'tabset',
        id: 'parent_tabset',
        children: [
          {
            type: 'tab',
            name: 'Tab 1',
            id: 'top_tab',
            component: 'tab1',
            config: { text: 'Tab 1 Content' },
          },
          {
            type: 'tab',
            name: 'Tab 2',
            id: 'bottom_tab',
            component: 'tab1',
            config: { text: 'Tab 1 Content' },
          },
        ],
      },
    ],
  },
};

// Panel instances with position
const panel1 = new Panel('tabset_1', 'Tabset 1', Position.LEFT, [
  { name: 'Initial A', component: 'tab1' },
]);
const panel2 = new Panel('tabset_2', 'Tabset 2', Position.RIGHT, [
  { name: 'Initial B', component: 'tab2' },
]);

const ruI18n: Partial<Record<I18nLabel, string>> = {
  [I18nLabel.Close_Tab]: 'Закрыть',
  [I18nLabel.Close_Tabset]: 'Закрыть группу вкладок',
  [I18nLabel.Active_Tabset]: 'Активировать группу вкладок',
  [I18nLabel.Move_Tabset]: 'Переместить группу вкладок',
  [I18nLabel.Move_Tabs]: 'Переместить вкладки',
  [I18nLabel.Maximize]: 'Развернуть группу вкладок',
  [I18nLabel.Restore]: 'Восстановить группу вкладок',
  [I18nLabel.Popout_Tab]: 'Вынести вкладку в отдельное окно',
  [I18nLabel.Overflow_Menu_Tooltip]: 'Скрытые вкладки',
  [I18nLabel.Error_rendering_component]: 'Ошибка при отрисовке компонента',
  [I18nLabel.Error_rendering_component_retry]: 'Повторить',
};

const App: React.FC = () => {
  const [model] = useState<Model>(Model.fromJson(json));
  const [layoutManager] = useState(() => new LayoutManager(model));
  // track per-tab toggle state for the custom button
  const [tabToggle, setTabToggle] = useState<Record<string, boolean>>({});

  useEffect(() => {
    layoutManager.registerPanel(panel1);
    layoutManager.registerPanel(panel2);
  }, []);

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

  // Add a custom icon button on each tab label (next to the close button)
  const onRenderTab = (node: TabNode, renderValues: any) => {
    const tabId = node.getId?.() ?? node.getName?.() ?? 'unknown';
    const isToggled = !!tabToggle[tabId];

    renderValues.buttons.push(
      <button
        key={`custom-${tabId}`}
        title={isToggled ? 'Custom: on' : 'Custom: off'}
        // className="flexlayout__tab_button_custom"
        aria-pressed={isToggled}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          marginLeft: 4,
          lineHeight: 1,
          color: isToggled ? '#0b74de' : '#74777F',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setTabToggle((prev) => ({ ...prev, [tabId]: !prev[tabId] }));
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.2553 1.8531C13.0557 1.48571 14.0258 1.67229 14.6748 2.32103L17.6793 5.32478L17.7135 5.35977L17.7151 5.36547C18.3767 6.05784 18.5294 7.09247 18.0667 7.90372C17.6663 8.60238 16.9173 9.0176 16.1331 8.99422C16.1259 8.99423 16.1195 8.9953 16.1136 8.99585L16.103 8.99666L14.3085 11.3884L14.3077 11.3876C13.8325 12.0226 13.793 12.7861 13.8504 13.3334L13.8634 13.5076C13.8952 14.314 13.553 15.0724 12.9267 15.5885L12.7884 15.6951C12.3586 16.0051 11.8485 16.1549 11.3373 16.1549C10.6892 16.1547 10.0342 15.9148 9.52174 15.4517L9.42083 15.3565L7.62151 13.5572L3.92195 17.2559L3.92277 17.2568C3.76019 17.4204 3.54625 17.5017 3.33357 17.5017C3.12023 17.5016 2.9063 17.4187 2.74438 17.2568C2.41934 16.9312 2.41905 16.4037 2.74438 16.0784L6.44393 12.378L4.64542 10.5795C3.734 9.66781 3.57857 8.22266 4.30688 7.21199L4.41349 7.07364C4.96671 6.40339 5.79917 6.0618 6.66692 6.14998H6.66854L6.88257 6.16707C7.40271 6.19214 8.05844 6.10852 8.61354 5.69262L11.0045 3.89737C11.0051 3.89492 11.0066 3.89188 11.0069 3.88842V3.72647C11.0321 2.98538 11.4412 2.3088 12.0974 1.93366L12.2553 1.8531ZM13.4947 3.49861C13.321 3.32451 13.0766 3.29438 12.9226 3.38142C12.6871 3.51606 12.67 3.72429 12.6728 3.81273L12.6679 4.01863C12.6321 4.46146 12.4275 4.87318 12.0934 5.15877L12.0144 5.22224L9.61289 7.024C8.7578 7.66369 7.67271 7.93087 6.49195 7.80525C6.46075 7.80205 6.42806 7.80037 6.3951 7.80037C6.1065 7.80047 5.83628 7.93755 5.6578 8.18448L5.65861 8.1853C5.41853 8.51868 5.46794 9.04417 5.823 9.39949L10.6 14.1749L10.6684 14.2384C11.0211 14.5368 11.5013 14.5655 11.8142 14.3409L11.9103 14.262C12.0901 14.0938 12.1913 13.868 12.1975 13.6272L12.1927 13.5059C12.068 12.3246 12.3342 11.2425 12.9747 10.3866L14.7765 7.9851L14.84 7.90535C15.1678 7.52043 15.6657 7.30109 16.1892 7.32674H16.1909L16.2755 7.32348C16.3757 7.30963 16.5156 7.25512 16.6181 7.07527L16.645 7.01424C16.6875 6.88499 16.6632 6.7142 16.5587 6.57153L16.4993 6.50317L13.4947 3.49861Z" />
        </svg>
      </button>,
    );
  };

  const addPanel1 = () => {
    layoutManager.renderPanel('tabset_1');
  };

  const addPanel2 = () => {
    layoutManager.renderPanel('tabset_2');
  };

  const moveBottomUnderTop = () => {
    model.doAction(
      Actions.moveNode(
        'bottom_tab',
        'parent_tabset',
        DockLocation.BOTTOM,
        -1,
        true,
      ),
    );
  };

  const toggleTopTabTabbar = () => {
    const topTab: any = model.getNodeById('top_tab');
    const tabset = topTab?.getParent?.();
    const tabsetId = tabset?.getId?.();
    if (!tabsetId) {
      // eslint-disable-next-line no-console
      console.warn('toggleTopTabTabbar: parent tabset for top_tab not found');
      return;
    }
    const current = tabset?.getAttr?.('enableTabStrip');
    const isEnabled = current === undefined ? true : !!current; // default is true
    const nextEnabled = !isEnabled;
    model.doAction(
      Actions.updateNodeAttributes(tabsetId, { enableTabStrip: nextEnabled }),
    );

    // Additionally adjust splitter sizes as requested
    try {
      const horiz = document.querySelectorAll<HTMLElement>(
        '.flexlayout__splitter_horz',
      );
      const vert = document.querySelectorAll<HTMLElement>(
        '.flexlayout__splitter_vert',
      );
      const compact = !nextEnabled; // when tabbar hidden, make splitters 1px
      horiz.forEach((el) => {
        el.style.width = compact ? '1px' : '8px';
        el.style.minWidth = compact ? '1px' : '8px';
      });
      vert.forEach((el) => {
        el.style.height = compact ? '1px' : '8px';
        el.style.minHeight = compact ? '1px' : '8px';
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to adjust splitter sizes', e);
    }
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
        className="buttonBlock"
        style={{
          padding: '8px',
          background: '#f0f0f0',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button onClick={addPanel1}>Add tabset_1 (Left)</button>
        <button onClick={addPanel2}>Add tabset_2 (Right)</button>
        <button onClick={moveBottomUnderTop}>
          Move bottom_tab under top_tab
        </button>
        <button onClick={toggleTopTabTabbar}>
          Toggle tabbar of tabset containing top_tab
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Layout
          model={model}
          factory={factory}
          onRenderTab={onRenderTab}
          i18nMapper={(id, defaultValue) =>
            ruI18n[id as I18nLabel] ?? defaultValue
          }
          onModelChange={(m, action) => {
            const type = action?.type ?? '';
            if (type.includes('SelectTab')) {
              const activeTabset = m.getActiveTabset?.();
              const selected = activeTabset?.getSelectedNode?.();
              const tabId = selected?.getId?.();
              const tabName = selected?.getAttr?.('name');
              const tabsetId = activeTabset?.getId?.();
              // eslint-disable-next-line no-console
              console.log('[FlexLayout] Active tab changed', {
                tabId,
                tabName,
                tabsetId,
              });
            }
            if (type.includes('SetActiveTabset')) {
              const activeTabset = m.getActiveTabset?.();
              const tabsetId = activeTabset?.getId?.();
              const selectedTabId = activeTabset
                ?.getSelectedNode?.()
                ?.getId?.();
              // eslint-disable-next-line no-console
              console.log('[FlexLayout] Active tabset changed', {
                tabsetId,
                selectedTabId,
              });
            }
          }}
          onAction={(action) => {
            return action;
            // if (action.type === 'FlexLayout_DeleteTab') {
            //   const node = model.getNodeById(action.data.node);
            //   if (node && node instanceof TabNode) {
            //     layoutManager.closeTab(node);
            //   }
            // }
            return action;
          }}
        />
      </div>
    </div>
  );
};

export default App;
