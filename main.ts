import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';
import { moment } from "obsidian";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	clockFormat: string;
	isUTC: boolean;
	updateIntervalMilliseconds: string;
	modifiedKeyName: string;
	modifiedKeyFormat: string;
	enableClock: boolean;
	enableModifiedKeyUpdate: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	clockFormat: 'HH:mm:ss',
	updateIntervalMilliseconds: '1000',
	isUTC: false,
	modifiedKeyName: 'updated_at',
	modifiedKeyFormat: 'YYYY-MM-DD[T]HH:mm:ss.SSSZ',
	enableClock: true,
	enableModifiedKeyUpdate: true
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	statusBar: HTMLElement;    // # Required
	isProccessing = false;

	async onload() {
		await this.loadSettings();


		if (this.settings.enableClock)
		{
			// # Adds a status bar
			this.statusBar = this.addStatusBarItem();
			this.statusBar.setText(":)")

			// # Change status bar text every second
			this.updateStatusBar();
			setInterval(this.updateStatusBar.bind(this), +this.settings.updateIntervalMilliseconds);
		}

		// # On file modification
		this.registerEvent(this.app.vault.on('modify', (file) => {
			console.log('File has been modified.');
			if (this.settings.enableModifiedKeyUpdate)
			{
				this.updateModifiedKey(file);
			}
		}))

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}
	// # The actual function
	updateStatusBar() {
		const dateNow = moment();
		const dateUTC = moment.utc();    // Convert to UTC time

		const dateChosen = this.settings.isUTC ? dateUTC : dateNow;
		const dateFormatted = dateChosen.format(this.settings.clockFormat);
		const emoji = this.getClockEmojiForHour(dateChosen);

		this.statusBar.setText(emoji + " " + dateFormatted);
	}

	async updateModifiedKey(file: TAbstractFile) {

		await this.app.fileManager.processFrontMatter(file as TFile, (frontmatter) => {
			const dateNow = moment();
			const dateFormatted = dateNow.format(this.settings.modifiedKeyFormat);

			const updateKeyValue = moment(this.getNestedValue(frontmatter, this.settings.modifiedKeyName), this.settings.modifiedKeyFormat);
			
			if (updateKeyValue.add(1, 'minutes') > dateNow)
			{
				return;
			}
			
			this.setNestedValue(frontmatter, this.settings.modifiedKeyName, dateFormatted);
		})
	}

	getNestedValue(obj: any, path: string) {
		const keys = path.split('.');
		let value = obj;
	  
		for (const key of keys) {
		  value = value[key];
		  if (value === undefined) {
			return undefined; // If any key is not found, return undefined
		  }
		}
	
		return value;
	}

	setNestedValue(obj: any, path: string, value: string) {
		const keys = path.split('.');
		let currentLevel = obj;
	  
		for (let i = 0; i < keys.length - 1; i++) {
		  const key = keys[i];
		  if (!currentLevel[key]) {
			currentLevel[key] = {};
		  }
		  currentLevel = currentLevel[key];
		}
	
		currentLevel[keys[keys.length - 1]] = value;
	}

	getClockEmojiForHour(time: moment.Moment): string {
		const hour = time.hour();
		const hour12 = (hour % 12) || 12;
		const clockEmojis = [
		  '🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'
		];
	  
		if (hour12 >= 0 && hour12 <= 11) {
		  return clockEmojis[hour12];
		} else {
		  return '⏰'; // Default emoji for unknown hours
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		const createLink = () => {
			const linkEl = document.createDocumentFragment();

			linkEl.append(
				linkEl.createEl('a', {
					href: 'https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/',
					text: 'Moment.js date format documentation'
				})
			)
			return linkEl;
		}

		containerEl.createEl('h1', { text: 'Status Bar' });
		containerEl.createEl('p', { text: 'Displays clock in the status bar' });

		new Setting(containerEl)
			.setName('Enable status bar clock')
			.setDesc('Show clock on the status bar? This setting requires restart of the plugin.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableClock)
					.onChange(async (newValue) => {
						this.plugin.settings.enableClock = newValue;
						await this.plugin.saveSettings();
				}),);

		new Setting(containerEl)
			.setName('Date format')
			.setDesc(createLink())
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.clockFormat)
				.onChange(async (value) => {
					this.plugin.settings.clockFormat = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Update interval')
			.setDesc('In milliseconds. Restart plugin for this setting to take effect.')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.updateIntervalMilliseconds)
				.onChange(async (value) => {
					this.plugin.settings.updateIntervalMilliseconds = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('UTC timezone')
			.setDesc('Use UTC instead of local time?')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isUTC)
					.onChange(async (newValue) => {
						this.plugin.settings.isUTC = newValue;
						await this.plugin.saveSettings();
					}),);

		containerEl.createEl('h1', { text: 'Frontmatter' });
		containerEl.createEl('p', { text: 'Handles timestamp keys in frontmatter' });
		containerEl.createEl('h2', { text: 'Modified Key' });

		new Setting(containerEl)
			.setName('Enable update of the modified key')
			.setDesc('')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableModifiedKeyUpdate)
					.onChange(async (newValue) => {
						this.plugin.settings.enableModifiedKeyUpdate = newValue;
						await this.plugin.saveSettings();
					}),);

		new Setting(containerEl)
		.setName('Modified key name')
		.setDesc('Supports nested keys. For example `timethings.updated_at`')
		.addText(text => text
			.setPlaceholder('Enter your secret')
			.setValue(this.plugin.settings.modifiedKeyName)
			.onChange(async (value) => {
				this.plugin.settings.modifiedKeyName = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Modified key format')
		.setDesc(createLink())
		.addText(text => text
			.setPlaceholder('Enter your secret')
			.setValue(this.plugin.settings.modifiedKeyFormat)
			.onChange(async (value) => {
				this.plugin.settings.modifiedKeyFormat = value;
				await this.plugin.saveSettings();
			}));
	}
	
}
