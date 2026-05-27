import { Tool, ToolCall } from '@/lib/models/types';
import {
  ActionOutput,
  AdditionalConfig,
  ClassifierOutput,
  ResearchAction,
  SearchAgentConfig,
  SearchSources,
} from '../../types';

class ActionRegistry {
  private static actions: Map<string, ResearchAction> = new Map();

  static register(action: ResearchAction<any>) {
    this.actions.set(action.name, action);
  }

  static get(name: string): ResearchAction | undefined {
    return this.actions.get(name);
  }

  static getAvailableActions(config: {
    classification: ClassifierOutput;
    fileIds: string[];
    mode: SearchAgentConfig['mode'];
    sources: SearchSources[];
  }): ResearchAction[] {
    return Array.from(
      this.actions.values().filter((action) => action.enabled(config)),
    );
  }

  static getAvailableActionTools(config: {
    classification: ClassifierOutput;
    fileIds: string[];
    mode: SearchAgentConfig['mode'];
    sources: SearchSources[];
  }): Tool[] {
    const availableActions = this.getAvailableActions(config);

    return availableActions.map((action) => ({
      name: action.name,
      description: action.getToolDescription({ mode: config.mode }),
      schema: action.schema,
    }));
  }

  static getAvailableActionsDescriptions(config: {
    classification: ClassifierOutput;
    fileIds: string[];
    mode: SearchAgentConfig['mode'];
    sources: SearchSources[];
  }): string {
    const availableActions = this.getAvailableActions(config);

    return availableActions
      .map(
        (action) =>
          `<tool name="${action.name}">\n${action.getDescription({ mode: config.mode })}\n</tool>`,
      )
      .join('\n\n');
  }

  static async execute(
    name: string,
    params: any,
    additionalConfig: AdditionalConfig & {
      researchBlockId: string;
      fileIds: string[];
      mode: SearchAgentConfig['mode'];
    },
  ) {
    const rawName = String(name || '');
    let normalizedName = rawName;

    if (!this.actions.has(normalizedName)) {
      const knownAction = Array.from(this.actions.keys()).find((actionName) =>
        rawName.includes(actionName),
      );

      if (knownAction) {
        console.warn('[Etherana actions] Normalized malformed action name:', {
          rawName: rawName.slice(0, 160),
          normalizedName: knownAction,
        });
        normalizedName = knownAction;
      }
    }

    const action = this.actions.get(normalizedName);

    if (!action) {
      console.warn('[Etherana actions] Ignoring unknown action:', {
        name: rawName.slice(0, 160),
      });

      return {
        error: true,
        ignored: true,
        message: `Action with name ${rawName.slice(0, 80)} not found`,
      } as unknown as ActionOutput;
    }

    return action.execute(params, additionalConfig);
  }

  static async executeAll(
    actions: ToolCall[],
    additionalConfig: AdditionalConfig & {
      researchBlockId: string;
      fileIds: string[];
      mode: SearchAgentConfig['mode'];
    },
  ): Promise<ActionOutput[]> {
    return Promise.all(
      actions.map(async (actionConfig) => {
        return this.execute(
          actionConfig.name,
          actionConfig.arguments,
          additionalConfig,
        );
      }),
    );
  }
}

export default ActionRegistry;
