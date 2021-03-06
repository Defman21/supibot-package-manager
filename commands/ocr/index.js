module.exports = {
	Name: "ocr",
	Aliases: null,
	Author: "supinic",
	Cooldown: 10000,
	Description: "Takes your image link and attempts to find the text in it by using OCR.",
	Flags: ["mention","non-nullable","pipe"],
	Whitelist_Response: null,
	Static_Data: (() => ({
		languages: {
			ara: "Arabic",
			bul: "Bulgarian",
			chs: "Chinese",
			hrv: "Croatian",
			cze: "Czech",
			dan: "Danish",
			dut: "Dutch",
			eng: "English",
			fin: "Finnish",
			fre: "French",
			ger: "German",
			gre: "Greek",
			hun: "Hungarian",
			kor: "Korean",
			ita: "Italian",
			jpn: "Japanese",
			pol: "Polish",
			por: "Portuguese",
			rus: "Russian",
			slv: "Slovenian",
			spa: "Spanish",
			swe: "Swedish",
			tur: "Turkish"
		}
	})),
	Code: (async function ocr (context, ...args) {
		let language = "eng";
		for (let i = 0; i < args.length; i++) {
			const token = args[i];
			if (token.includes("lang:")) {
				language = sb.Utils.languageISO.getCode(token.split(":")[1], "iso6393");
				if (!language) {
					return {
						success: false,
						reply: "Language could not be parsed!"
					};
				}
	
				args.splice(i, 1);
			}
		}
	
		if (language === "chi") {
			language = "chs"; // thanks for using standard codes everyone
		}
	
		if (!this.staticData.languages[language]) {
			return {
				success: false,
				reply: "Language not supported, use one from the list in the help description",
				cooldown: 2500
			};
		}
	
		const link = args.shift();
		if (!link) {
			return {
				success: false,
				reply: "No link provided!",
				cooldown: 2500
			};
		}
	
		const { statusCode, body: data } = await sb.Got({
			method: "GET",
			responseType: "json",
			throwHttpErrors: false,
			url: "https://api.ocr.space/parse/imageurl",
			headers: {
				apikey: sb.Config.get("API_OCR_SPACE")
			},
			searchParams: new sb.URLParams()
				.set("url", link)
				.set("language", language)
				.set("scale", "true")
				.set("isTable", "true")
				.set("OCREngine", "1")
				.set("isOverlayRequired", "false")
				.toString()
		});
	
		if (statusCode !== 200 || data?.OCRExitCode !== 1) {
			return {
				success: false,
				reply: (data?.ErrorMessage) 
					? data.ErrorMessage.join(" ")
					: data
			};
		}
	
		const result = data.ParsedResults[0].ParsedText;
		return {
			reply: (result.length === 0)
				? "No text found."
				: result
		};
	}),
	Dynamic_Description: (async (prefix, values) => {
		const { languages } = values.getStaticData();
		const list = Object.values(languages).map(name => `<li>${name}</li>`).join("");
	
		return [
			"Attempts to read a provided image with OCR, and posts the found text in chat.",
			"You can specify a language, and only 3-letter codes are supported, i.e. 'jpn'.",
			"By default, the language is English (eng).",
			"",
	
			`<code>${prefix}ocr <a href="https://i.imgur.com/FutGrGV.png">https://i.imgur.com/FutGrGV.png</a></code>`,
			"HELLO WORLD LOL NAM",
			"",
			
			`<code>${prefix}ocr lang:jpn <a href="https://i.imgur.com/4iK4ZHy.png">https://i.imgur.com/4iK4ZHy.png</a></code>`,
			"ロ明寝マンRetweeted 蜜柑すい@mikansul・May11 ティフアに壁ドンされるだけ",
			"",
	
			"List of supported languages:",
			list
		];
	})
};