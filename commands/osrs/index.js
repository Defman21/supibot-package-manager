module.exports = {
	Name: "osrs",
	Aliases: null,
	Author: "supinic",
	Cooldown: 5000,
	Description: "Aggregate command for whatever regarding Old School Runescape.",
	Flags: ["mention","use-params"],
	Whitelist_Response: null,
	Static_Data: (() => ({
		fetch: async (user) => {
			let data = await sb.Cache.getByPrefix("command-osrs-stats", {
				keys: { user }
			});
	
			if (!data) {
				const apiData = await sb.Got.instances.Supinic("osrs/lookup/" + user).json();
				if (!apiData.data) {
					return {
						success: false,
						reply: `No data found for given player name!`
					};
				}
	
				data = apiData.data;
				await sb.Cache.setByPrefix("command-osrs-stats", data, {
					keys: { user },
					expiry: 600_000
				});
			}
	
			return data;
		},

		getIronman: (data) => {
			let ironman = "user";
			if (data.ironman.regular) {
				ironman = "ironman";
			}
			else if (data.ironman.hardcore) {
				ironman = "hardcore ironman";
			}
			else if (data.ironman.ultimate) {
				ironman = "ultimate ironman";
			}

			return ironman;
		},

		subcommands: ["itemid", "kc", "price", "stats"],

		activities: [
			"abyssal sire", "alchemical hydra", "barrows chests", "bounty hunter - hunter", "bounty hunter - rogue",
			"bryophyta", "callisto", "cerberus", "chambers of xeric", "chambers of xeric: challenge mode", "chaos elemental",
			"chaos fanatic", "clue scrolls (all)", "clue scrolls (beginner)", "clue scrolls (easy)", "clue scrolls (elite)",
			"clue scrolls (hard)", "clue scrolls (master)", "clue scrolls (medium)", "commander zilyana", "corporeal beast", 
			"crazy archaeologist", "dagannoth prime", "dagannoth rex", "dagannoth supreme", "deranged archaeologist",
			"general graardor", "giant mole", "grotesque guardians", "hespori", "k'ril tsutsaroth", "kalphite queen", 
			"king black dragon", "kraken", "kree'arra", "league points", "lms - rank", "mimic", "nightmare", "obor", "sarachnis",
			"scorpia", "skotizo", "the corrupted gauntlet", "the gauntlet", "theatre of blood", "thermonuclear smoke devil",
			"tzkal-zuk", "tztok-jad", "venenatis", "vet'ion", "vorkath", "wintertodt", "zalcano", "zulrah"
		],
		
		skills: [
			{ name: "Overall", emoji: "🏆" },
			{ name: "Attack", emoji: "⚔" },
			{ name: "Strength", emoji: "✊" },
			{ name: "Defence", emoji: "🛡" },
			{ name: "Ranged", emoji: "🏹" },
			{ name: "Prayer", emoji: "✨" },
			{ name: "Magic", emoji: "🧙‍" },
			{ name: "Runecrafting", emoji: "➰" },
			{ name: "Construction", emoji: "🏡" },
			{ name: "Hitpoints", emoji: "♥" },
			{ name: "Agility", emoji: "🏃‍" },
			{ name: "Herblore", emoji: "🌿" },
			{ name: "Thieving", emoji: "💰" },
			{ name: "Crafting", emoji: "🛠" },
			{ name: "Fletching", emoji: "🔪" },
			{ name: "Slayer", emoji: "💀" },
			{ name: "Hunter", emoji: "🐾" },
			{ name: "Mining", emoji: "⛏" },
			{ name: "Smithing", emoji: "🔨" },
			{ name: "Fishing", emoji: "🐟" },
			{ name: "Cooking", emoji: "🍲" },
			{ name: "Firemaking", emoji: "🔥" },
			{ name: "Woodcutting", emoji: "🌳" },
			{ name: "Farming", emoji: "‍🌽" },
		]
	})),
	Code: (async function osrs (context, ...args) {
		const firstCheck = args.splice(0, 1);
		if (!firstCheck) {
			return {
				success: false,
				reply: `Not enough arguments provided! Check the command help here: https://supinic.com/bot/command/${this.ID}`
			};
		}

		const first = firstCheck[0];
		let command = first.toLowerCase();
		if (!this.staticData.subcommands.includes(command)) {
			args.unshift(first);
			command = "stats";
		}
	
		switch (command.toLowerCase()) {
			case "price": {
				const alias = await sb.Query.getRecordset(rs => rs
					.select("Name")
					.from("osrs", "Item")
					.where(`JSON_SEARCH(Aliases, "one", %s) IS NOT NULL`, args.join(" ").toLowerCase())
					.single()
					.limit(1)
					.flat("Name")
				);

				const query = (alias ?? args.join(" ")).toLowerCase();
				const data = await sb.Query.getRecordset(rs => {
					rs.select("Game_ID", "Name").from("osrs", "Item");

					for (const word of query.split(" ")) {
						rs.where("Name %*like*", word);
					}

					return rs;
				});
	
				if (data.length === 0) {
					return {
						success: false,
						reply: `No items found for given query!`
					};
				}
	
				const bestMatch = sb.Utils.selectClosestString(query, data.map(i => i.Name), { ignoreCase: true });
				const item = (bestMatch !== null)
					? data.find(i => i.Name.toLowerCase() === bestMatch.toLowerCase())
					: data[0];

				if (!item) {
					return {
						success: false,
						reply: "Could not match item!"
					};
				}

				const { statusCode, body: detail } = await sb.Got({
					url: "https://secure.runescape.com/m=itemdb_oldschool/api/catalogue/detail.json",
					throwHttpErrors: false,
					responseType: "json",
					searchParams: new sb.URLParams()
						.set("item", item.Game_ID)
						.toString()
				});
	
				if (statusCode !== 200) {
					return {
						success: false,
						reply: `Item not found!`
					};
				}

				const { current, today } = detail.item;
				const wiki = "https://osrs.wiki/" + item.Name.replace(/\s+/g, "_");
				return {
					reply: sb.Utils.tag.trim `
						Current price of ${detail.item.name}: ${current.price},
						current trend: ${today.trend} (${today.price})
						${wiki}
					`
				};
			}
	
			case "stats": {
				const user = args.join(" ");
				if (!user) {
					return {
						success: false,
						reply: `No player name provided!`
					};
				}
	
				const data = await this.staticData.fetch(user);
				if (data.success === false) {
					return data;
				}

				const ironman = this.staticData.getIronman(data);
				if (context.params.skill) {
					const skillName = context.params.skill.toLowerCase();
					const skill = data.skills.find(i => i.name.toLowerCase() === skillName);

					if (!skill) {
						return {
							success: false,
							reply: `That skill does not exist!`
						};
					}
					else if (skill.level === null) {
						return {
							success: false,
							reply: `That ${ironman}'s ${context.params.skill.toLowerCase()} is not high enough level to appear on the highscores!`
						};
					}
	
					const { emoji } = this.staticData.skills.find(i => i.name.toLowerCase() === skillName);
					return {
						reply: `${sb.Utils.capitalize(ironman)} ${user} ${emoji} ${skill.level} (XP: ${sb.Utils.groupDigits(skill.experience)})`
					};
				}
	
				const strings = [];
				for (const { emoji, name } of this.staticData.skills) {
					const found = data.skills.find(i => i.name.toLowerCase() === name.toLowerCase());
					if (found && found.level !== null) {
						strings.push(`${emoji} ${found.level}`);
					}
				}
	
				if (strings.length === 0) {
					return {
						reply: `${sb.Utils.capitalize(ironman)} ${user} exists, but none of their stats are being tracked.`
					};
				}
				else {
					return {
						reply: sb.Utils.tag.trim `
							Stats for ${ironman} ${user}:
							${strings.join(" ")}
						`
					};
				}
			}

			case "kc": {
				const input = { username: null, activity: null };
				const [first, second] = args.join(" ").toLowerCase().split(",").map(i => i.trim());

				if (this.staticData.activities.includes(first)) {
					input.activity = first;
					input.username = second;
				}
				else if (this.staticData.activities.includes(second)) {
					input.username = first;
					input.activity = second;
				}
				else {
					return {
						success: false,
						reply: `Could not match any activity! Check the list of activities here: https://supinic.com/bot/command/${this.ID}`
					};
				}

				const data = await this.staticData.fetch(input.username);
				if (data.success === false) {
					return data;
				}
	
				const activities = data.activities.map(i => i.name.toLowerCase());
				const bestMatch = sb.Utils.selectClosestString(input.activity, activities, { ignoreCase: true });
				if (!bestMatch) {
					return {
						success: false,
						reply: `Activity was not found! Check the command's help for a list.`
					};
				}

				const ironman = sb.Utils.capitalize(this.staticData.getIronman(data));
				const { name, rank, value } = data.activities.find(i => i.name.toLowerCase() === bestMatch.toLowerCase());
				return {
					reply: (rank === null)
						? `${ironman} ${input.username} is not ranked for ${name}.`
						: `${ironman} ${input.username}'s KC for ${name}: ${value} - rank #${rank}.`
				};
			}

			case "itemid": {
				const data = await sb.Query.getRecordset(rs => {
					rs.select("Game_ID", "Name")
						.from("osrs", "Item")
						.limit(5);

					for (const word of args) {
						rs.where("Name %*like*", word);
					}

					return rs;
				});

				return {
					reply: data.map(i => `${i.Name}: ${i.Game_ID}`).join("; ")
				};
			}

			default:
				return {
					success: false,
					reply: `Invalid subcommand provided! Check this command's extended help for more info.`
				};
		}
	}),
	Dynamic_Description: null
};