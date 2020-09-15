import React from 'react';
import { Slot, SlotRegistry } from '@teambit/harmony';
import Mousetrap from 'mousetrap';

import UIAspect, { UIRuntime, UiUI } from '@teambit/ui';
import { CommandBar } from './ui/command-bar';
import { CommandSearcher } from './ui/command-searcher';
import { CommandBarAspect } from './command-bar.aspect';
import { commandBarCommands } from './command-bar.commands';
import { SearchProvider, Keybinding, CommandHandler, CommandId } from './types';

const RESULT_LIMIT = 5;
type SearcherSlot = SlotRegistry<SearchProvider>;
type CommandSlot = SlotRegistry<CommandEntry[]>;

export type CommandEntry = {
  id: CommandId;
  handler: CommandHandler;
  keybinding?: Keybinding;
  displayName: string;
};

/** Quick launch actions. Use the `addSearcher` slot to extend the available actions */
export class CommandBarUI {
  private mousetrap = new Mousetrap();
  private commandRegistry = new Map<CommandId, CommandEntry>();
  private commandSearcher = new CommandSearcher([]);

  /** Opens the command bar */
  open = () => {
    this.setVisibility?.(true);
  };

  /** Closes the command bar */
  close = () => {
    this.setVisibility?.(false);
  };

  /** Add and autocomplete provider. To support keyboard navigation, each result should have a props `active: boolean`, and `exectue: () => any` */
  addSearcher(commandSearcher: SearchProvider) {
    this.searcherSlot.register(commandSearcher);
    return this;
  }

  addCommand(...commands: CommandEntry[]) {
    commands.forEach(({ id: commandId }) => {
      if (this.getCommand(commandId) !== undefined) throw new Error(`command already exists: "${commandId}"`);
    });

    this.commandSlot.register(commands);

    commands.forEach((command) => {
      if (command.keybinding) {
        this.addKeybinding(command.keybinding, command.id);
      }
    });

    this.updateCommandsSearcher();
  }

  run(commandId: CommandId) {
    const commandEntry = this.getCommand(commandId);
    if (!commandEntry) return;

    commandEntry.handler();
  }

  trigger = (key: string) => {
    this.mousetrap.trigger(key);
  };

  search = (term: string, limit: number = RESULT_LIMIT) => {
    const searchers = this.searcherSlot.values();

    const searcher = searchers.find((x) => x.test(term));
    return searcher?.search(term, limit) || [];
  };

  private getCommand(id: CommandId) {
    const relevantCommands = this.commandSlot
      .values()
      .map((commands) => commands.find((command) => command.id === id))
      .filter((x) => !!x);

    return relevantCommands.pop();
  }

  private updateCommandsSearcher() {
    const commands = this.commandSlot.values().flat();
    this.commandSearcher.update(commands);
  }

  private addKeybinding(key: Keybinding, command: CommandId) {
    this.mousetrap.bind(key, this.run.bind(this, command));
  }

  setVisibility?: (visible: boolean) => void;

  getCommandBar = () => {
    return <CommandBar key="CommandBarUI" search={this.search} commander={this} />;
  };

  constructor(private searcherSlot: SearcherSlot, private commandSlot: CommandSlot) {
    this.addSearcher(this.commandSearcher);
  }

  static dependencies = [UIAspect];
  static slots = [Slot.withType<SearchProvider>(), Slot.withType<CommandEntry[]>()];
  static runtime = UIRuntime;
  static async provider([uiUi]: [UiUI], config, [searcherSlot, commandSlots]: [SearcherSlot, CommandSlot]) {
    const commandBar = new CommandBarUI(searcherSlot, commandSlots);

    commandBar.addCommand({
      id: commandBarCommands.open,
      handler: commandBar.open,
      displayName: 'open command bar',
      keybinding: 'mod+k',
    });

    uiUi.registerHudItem(commandBar.getCommandBar());

    return commandBar;
  }
}

CommandBarAspect.addRuntime(CommandBarUI);