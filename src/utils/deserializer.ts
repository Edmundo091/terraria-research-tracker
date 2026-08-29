// @ts-nocheck
import { getAllItems } from './itemsDb';
import { BinaryReader } from './binaryReader';

const allItems: any = getAllItems();
const allItemsCount = allItems.length;

export class PlayerDeserializer {
    #ENCRYPTION_KEY = this.#utf16leBytes("h3y_gUyZ");

    #FileType = { None: 0, Map: 1, World: 2, Player: 3 };

    #LatestSupportedVersion = 999;

    #FileTypeNames = Object.fromEntries(
        Object.entries(this.#FileType).map(([k, v]) => [v, k])
    );

    async deserializePlayer(encryptedPlayerFile) {
        let decryptedPlayerFile;
        try {
            decryptedPlayerFile = await this.#decrypt(encryptedPlayerFile);
        } catch (error) {
            alert("Error. Could't parse the file: " + error.message);
            throw error;
        }

        const reader = new BinaryReader(new Uint8Array(decryptedPlayerFile));

        const releaseVersion = reader.readInt32();
        console.log("Release version: " + releaseVersion);

        if (releaseVersion > this.#LatestSupportedVersion) {
            console.log("WARNING. The website may work unstably. Latest supported game version: " + this.#LatestSupportedVersion + ". Save file version: " + releaseVersion)
        }

        try {
            const metadata = this.#readMetadata(reader, this.#FileType.Player);
        } catch (error) {
            alert("Error. Couldn't read the file metadata: " + error.message);
            throw error;
        }

        let playerData;
        try {
            playerData = this.#deserialize(reader, releaseVersion);

            const { researchProgress, ...playerDataWithoutResearch } = playerData;
            console.log(playerDataWithoutResearch);
        } catch (error) {
            console.log(error);
            alert("Error during deserializing (look in the developer console for the details): " + error.message);
            throw error;
        }
        return playerData;
    }

    #deserialize(reader, releaseVersion) {
        const newPlayer = {};

        newPlayer.name = reader.readString();

        if (releaseVersion >= 10) {
            if (releaseVersion >= 17) {
                newPlayer.difficulty = reader.readByte();
            } else if (reader.readBoolean()) {
                newPlayer.difficulty = 2;
            }
        }

        if (releaseVersion >= 138) {
            newPlayer.playTime = 0;
            reader.readInt64();
        } else {
            newPlayer.playTime = 0;
        }

        newPlayer.hair = reader.readInt32();

        if (newPlayer.hair >= 228) {
            newPlayer.hair = 0;
        }

        if (releaseVersion >= 82) {
            newPlayer.hairDye = reader.readByte();
        }
        if (releaseVersion >= 283) {
            newPlayer.team = reader.readByte();
        }

        newPlayer.hideVisibleAccessory = [];
        if (releaseVersion >= 124) {
            const bitsByte1 = reader.readByteBits();
            for (let i = 0; i < 8; i++) {
                newPlayer.hideVisibleAccessory[i] = bitsByte1[i];
            }

            const bitsByte2 = reader.readByteBits();
            for (let i = 0; i < 2; i++) {
                newPlayer.hideVisibleAccessory[i + 8] = bitsByte2[i];
            }
        } else if (releaseVersion >= 83) {
            const bitsByte = reader.readByteBits();
            for (let i = 0; i < 8; i++) {
                newPlayer.hideVisibleAccessory[i] = bitsByte[i];
            }
        }

        if (releaseVersion >= 119) {
            newPlayer.hideMisc = reader.readByte();
        }

        if (releaseVersion <= 17) {
            newPlayer.Male = newPlayer.hair != 5 && newPlayer.hair != 6 && newPlayer != 9 && newPlayer.hair != 11;
        } else if (releaseVersion < 107) {
            newPlayer.Male = reader.readBoolean();
        } else {
            newPlayer.skinVariant = reader.readByte();
        }

        newPlayer.statLife = reader.readInt32();
        newPlayer.statLifeMax = reader.readInt32();
        if (newPlayer.statLifeMax > 500) {
            newPlayer.statLifeMax = 500;
        }

        newPlayer.statMana = reader.readInt32();
        newPlayer.statManaMax = reader.readInt32();
        if (newPlayer.statManaMax > 200) {
            newPlayer.statManaMax = 200;
        }
        if (newPlayer.statMana > 400) {
            newPlayer.statMana = 400;
        }

        if (releaseVersion >= 125) {
            newPlayer.extraAccessory = reader.readBoolean();
        }

        if (releaseVersion >= 229) {
            newPlayer.unlockedBiomeTorches = reader.readBoolean();
            newPlayer.UsingBiomeTorches = reader.readBoolean();
            if (releaseVersion >= 256) {
                newPlayer.ateArtisanBread = reader.readBoolean();
            }

            const num = releaseVersion < 324 ? 0 : (reader.readBoolean() ? 1 : 0);

            if (releaseVersion >= 260) {
                newPlayer.usedAegisCrystal = reader.readBoolean();
                newPlayer.usedAegisFruit = reader.readBoolean();
                newPlayer.usedArcaneCrystal = reader.readBoolean();
                newPlayer.usedGalaxyPearl = reader.readBoolean();
                newPlayer.usedGummyWorm = reader.readBoolean();
                newPlayer.usedAmbrosia = reader.readBoolean();
            }
        }

        if (releaseVersion >= 182) {
            newPlayer.downedDD2EventAnyDifficulty = reader.readBoolean();
        }

        if (releaseVersion >= 128) {
            newPlayer.taxMoney = reader.readInt32();
        }

        if (releaseVersion >= 254) {
            newPlayer.numberOfDeathsPVE = reader.readInt32();
            newPlayer.numberOfDeathsPVP = reader.readInt32();
        }

        newPlayer.hairColor = reader.readRGB();
        newPlayer.skinColor = reader.readRGB();
        newPlayer.eyeColor = reader.readRGB();
        newPlayer.shirtColor = reader.readRGB();
        newPlayer.underShirtColor = reader.readRGB();
        newPlayer.pantsColor = reader.readRGB();
        newPlayer.shoeColor = reader.readRGB();

        if (releaseVersion >= 38) {
            newPlayer.armor = [];
            if (releaseVersion < 124) {
                let num = 11;
                if (releaseVersion >= 81) {
                    num = 16;
                }
                for (let index1 = 0; index1 < num; ++index1) {
                    let index2 = index1;
                    if (index2 >= 8) {
                        index2 += 2;
                    }
                    newPlayer.armor[index2] = {};
                    newPlayer.armor[index2].netDefaults = reader.readInt32();
                    newPlayer.armor[index2].Prefix = reader.readByte();
                }
            } else {
                for (let index = 0; index < 20; ++index) {
                    newPlayer.armor[index] = {};
                    newPlayer.armor[index].netDefaults = reader.readInt32();
                    newPlayer.armor[index].Prefix = reader.readByte();
                    if (releaseVersion >= 322) {
                        newPlayer.armor[index].favorited = reader.readBoolean();
                    }
                }
            }

            newPlayer.dye = [];
            if (releaseVersion >= 47) {
                let num = 3;
                if (releaseVersion >= 81) {
                    num = 8;
                }
                if (releaseVersion >= 124) {
                    num = 10;
                }
                for (let index3 = 0; index3 < num; ++index3) {
                    let index4 = index3;
                    newPlayer.dye[index4] = {};
                    newPlayer.dye[index4].netDefaults = reader.readInt32();
                    newPlayer.dye[index4].Prefix = reader.readByte();
                    if (releaseVersion >= 322) {
                        newPlayer.dye[index3].favorited = reader.readBoolean();
                    }
                }
            }

            newPlayer.inventory = [];
            if (releaseVersion >= 58) {
                for (let index = 0; index < 58; ++index) {
                    const type = reader.readInt32();
                    
                    newPlayer.inventory[index] = {};
                    if (type >= allItemsCount) {
                        // If item ID >= total items count, then consider it invalid and skip.
                        newPlayer.inventory[index].netDefaults = 0;
                        reader.readInt32();
                        reader.readByte();
                        if (releaseVersion >= 114) {
                            reader.readBoolean();
                        }
                    } else {
                        newPlayer.inventory[index].netDefaults = type;
                        newPlayer.inventory[index].stack = reader.readInt32();
                        newPlayer.inventory[index].Prefix = reader.readByte();
                        if (releaseVersion >= 114) {
                            newPlayer.inventory[index].favorited = reader.readBoolean();
                        }
                    }
                }
            } else {
                for (let index = 0; index < 48; ++index) {
                    const type = reader.readInt32();
                    
                    newPlayer.inventory[index] = {};
                    if (type >= allItemsCount) {
                        // If item ID >= total items count, then consider it invalid and skip.
                        newPlayer.inventory[index].netDefaults = 0;
                        reader.readInt32();
                        reader.readByte();
                    } else {
                        newPlayer.inventory[index].netDefaults = type;
                        newPlayer.inventory[index].stack = reader.readInt32();
                        newPlayer.inventory[index].Prefix = reader.readByte();
                    }
                }
            }

            newPlayer.miscEquips = [];
            newPlayer.miscDyes = [];
            if (releaseVersion >= 117) {
                if (releaseVersion < 136) {
                    for (let index = 0; index < 5; index++) {
                        newPlayer.miscEquips[index] = {};
                        newPlayer.miscDyes[index] = {};
                        if (index != 1) {
                            const type1 = reader.readInt32();
                            if (type1 >= allItemsCount) {
                                newPlayer.miscEquips[index].netDefaults = 0;
                                reader.readByte();
                            } else {
                                newPlayer.miscEquips[index].netDefaults = type1;
                                newPlayer.miscEquips[index].Prefix = reader.readByte();
                            }
                            const type2 = reader.readInt32();
                            if (type2 >= allItemsCount) {
                                newPlayer.miscDyes[index].netDefaults = 0;
                                reader.readByte();
                            } else {
                                newPlayer.miscDyes[index].netDefaults = type2;
                                newPlayer.miscDyes[index].Prefix = reader.readByte();
                            }
                        }
                    }
                } else {
                    for (let index = 0; index < 5; ++index) {
                        newPlayer.miscEquips[index] = {};
                        newPlayer.miscDyes[index] = {};
                        const type3 = reader.readInt32();
                        if (type3 >= allItemsCount) {
                            newPlayer.miscEquips[index].netDefaults = 0;
                            reader.readByte();
                        } else {
                            newPlayer.miscEquips[index].netDefaults = type3;
                            newPlayer.miscEquips[index].Prefix = reader.readByte();
                        }
                        const type4 = reader.readInt32();
                        if (type4 >= allItemsCount) {
                            newPlayer.miscDyes[index].netDefaults = 0;
                            reader.readByte();
                        } else {
                            newPlayer.miscDyes[index].netDefaults = type4;
                            newPlayer.miscDyes[index].Prefix = reader.readByte();
                        }
                    }
                }
            }

            newPlayer.bank = {};
            newPlayer.bank.item = [];
            newPlayer.bank2 = {};
            newPlayer.bank2.item = [];
            newPlayer.bank3 = {};
            newPlayer.bank3.item = [];
            newPlayer.bank4 = {};
            newPlayer.bank4.item = [];
            if (releaseVersion >= 58) {
                for (let index = 0; index < 40; ++index) {
                    newPlayer.bank.item[index] = {};
                    newPlayer.bank.item[index].netDefaults = reader.readInt32();
                    newPlayer.bank.item[index].stack = reader.readInt32();
                    newPlayer.bank.item[index].Prefix = reader.readByte();
                }
                for (let index = 0; index < 40; ++index) {
                    newPlayer.bank2.item[index] = {};
                    newPlayer.bank2.item[index].netDefaults = reader.readInt32();
                    newPlayer.bank2.item[index].stack = reader.readInt32();
                    newPlayer.bank2.item[index].Prefix = reader.readByte();
                }
            } else {
                for (let index = 0; index < 20; ++index) {
                    newPlayer.bank.item[index] = {};
                    newPlayer.bank.item[index].netDefaults = reader.readInt32();
                    newPlayer.bank.item[index].stack = reader.readInt32();
                    newPlayer.bank.item[index].Prefix = reader.readByte();
                }
                for (let index = 0; index < 20; ++index) {
                    newPlayer.bank2.item[index] = {};
                    newPlayer.bank2.item[index].netDefaults = reader.readInt32();
                    newPlayer.bank2.item[index].stack = reader.readInt32();
                    newPlayer.bank2.item[index].Prefix = reader.readByte();
                }
            }

            if (releaseVersion >= 182) {
                for (let index = 0; index < 40; ++index) {
                    newPlayer.bank3.item[index] = {};
                    newPlayer.bank3.item[index].netDefaults = reader.readInt32();
                    newPlayer.bank3.item[index].stack = reader.readInt32();
                    newPlayer.bank3.item[index].Prefix = reader.readByte();
                }
            }

            if (releaseVersion >= 198) {
                for (let index = 0; index < 40; ++index) {
                    newPlayer.bank4.item[index] = {};
                    newPlayer.bank4.item[index].netDefaults = reader.readInt32();
                    newPlayer.bank4.item[index].stack = reader.readInt32();
                    newPlayer.bank4.item[index].Prefix = reader.readByte();
                    if (releaseVersion >= 255) {
                        newPlayer.bank4.item[index].favorited = reader.readBoolean();
                    }
                }
            }

            if (releaseVersion >= 199) {
                newPlayer.voidVaultInfo = reader.readByte();
            }
        }

        newPlayer.buffType = [];
        newPlayer.buffTime = [];
        if (releaseVersion >= 11) {
            let num = 22;
            if (releaseVersion < 74) {
                num = 10;
            }
            if (releaseVersion >= 252) {
                num = 44;
            }

            for (let index = 0; index < num; ++index) {
                newPlayer.buffType[index] = reader.readInt32();
                newPlayer.buffTime[index] = reader.readInt32();
                if (newPlayer.buffType[index] == 0) {
                    --index;
                    --num;
                }
            }
        }

        newPlayer.spX = [];
        newPlayer.spY = [];
        newPlayer.spI = [];
        newPlayer.spN = [];
        for (let index = 0; index < 200; ++index) {
            let num = reader.readInt32();
            if (num != -1) {
                newPlayer.spX[index] = num;
                newPlayer.spY[index] = reader.readInt32();
                newPlayer.spI[index] = reader.readInt32();
                newPlayer.spN[index] = reader.readString();
            } else {
                break;
            }
        }

        if (releaseVersion >= 16) {
            newPlayer.hbLocked = reader.readBoolean();
        }

        newPlayer.hideInfo = [];
        if (releaseVersion >= 115) {
            for (let index = 0; index < 13; ++index) {
                newPlayer.hideInfo[index] = reader.readBoolean();
            }
        }

        if (releaseVersion >= 98) {
            newPlayer.anglerQuestsFinished = reader.readInt32();
        }

        newPlayer.DpadRadial = {};
        newPlayer.DpadRadial.Bindings = [];
        if (releaseVersion >= 162) {
            for (let index = 0; index < 4; ++index) {
                newPlayer.DpadRadial.Bindings[index] = reader.readInt32();
            }
        }

        newPlayer.builderAccStatus = [];
        if (releaseVersion >= 164) {
            let num = 8;
            if (releaseVersion >= 167) {
                num = 10;
            }
            if (releaseVersion >= 197) {
                num = 11;
            }
            if (releaseVersion >= 230) {
                num = 12;
            }
            for (let index = 0; index < num; ++index) {
                newPlayer.builderAccStatus[index] = reader.readInt32();
            }
            if (releaseVersion < 210) {
                newPlayer.builderAccStatus[0] = 1;
            }
            if (releaseVersion < 249) {
                let flag = false;
                for (let index = 0; index < 58; index++) {
                    if (newPlayer.inventory[index] && newPlayer.inventory[index].type === 3611) {
                        flag = true;
                        break;
                    }
                }
                if (flag) {
                    newPlayer.builderAccStatus[1] = 1;
                }
            }
        }

        if (releaseVersion >= 181) {
            newPlayer.bartenderQuestLog = reader.readInt32();
        }

        if (releaseVersion >= 200) {
            newPlayer.dead = reader.readBoolean();
            if (newPlayer.dead) {
                newPlayer.respawnTimer = reader.readInt32();
            }
        }

        newPlayer.lastTimePlayerWasSaved = 0;
        if (releaseVersion >= 202) {
            newPlayer.lastTimePlayerWasSaved = 0;
            reader.readInt64();
        }

        if (releaseVersion >= 206) {
            newPlayer.golferScoreAccumulated = reader.readInt32();
        }

        if (releaseVersion >= 218) {
            newPlayer.researchProgress = this.#getResearchProgess(reader, releaseVersion);
        }

        return newPlayer;
    }

    #getResearchProgess(reader, gameVersionSaveWasMadeOn) {
        const researchProgress = {};

        if (gameVersionSaveWasMadeOn >= 282) {
            reader.readBoolean();
        }


        let researchedItems = reader.readInt32();

        const allItemsCopy = structuredClone(allItems);

        const unknownItems = [];

        for (let index = 0; index < researchedItems; ++index) {
            let researchedItemInternalName;
            let researchedItemAmount;
            try {
                researchedItemInternalName = this.#fixItemInternalNames(reader.readString());
                researchedItemAmount = reader.readInt32();

                const item = allItemsCopy.find(item => item.internalName == researchedItemInternalName);
                if (item) {
                    item.researched = researchedItemAmount;
                    item.fullyResearched = researchedItemAmount >= item.neededForResearch;
                } else {
                    unknownItems.push(researchedItemInternalName);
                }
            } catch (error) {
                console.log(error);
                alert("Could not process item with internal name '" + researchedItemInternalName + "' and with amount '" + researchedItemAmount + "'");
            }
        }

        if (unknownItems.length > 0) {
            alert("These unknown items are ignored:\n\n" + unknownItems.join("\n"));
        }

        this.#addResearchOverride(allItemsCopy);

        researchProgress.items = allItemsCopy;

        return researchProgress;
    }

    #fixItemInternalNames(itemInternalName) {
        switch (itemInternalName) {
            case "EldMelter": return "ElfMelter";
            case "ThisIsCanonNow": return "BrasilianSkies";
            case "FoxparksTagEffect": return "Deprecated6143";
            default: return itemInternalName;
        }
    }

    #addResearchOverride(items) {
        const itemGroups = [
            [2611, 5526],
            [4131, 5325],
            [4346, 5391],
            [4767, 5453],
            [5309, 5454],
            [5323, 5455],
            [5324, 5329, 5330],
            [5358, 5359, 5360, 5361, 5437],
            [6168, 6169, 6193, 6194],
            [6190, 6195],
        ];

        const groupById = new Map();

        for (const itemGroup of itemGroups) {
            for (const itemId of itemGroup) {
                groupById.set(itemId, itemGroup);
            }
        }

        const markedGroups = new Set();

        for (const item of items) {
            if (item.fullyResearched) {
                const itemGroup = groupById.get(item.id);
                if (itemGroup) {
                    markedGroups.add(itemGroup);
                }
            }
        }

        for (const item of items) {
            const itemGroup = groupById.get(item.id);

            if (itemGroup && markedGroups.has(itemGroup)) {
                item.fullyResearched = true;
                item.researched = item.neededForResearch;
            }
        }
    }

    #utf16leBytes(str) {
        const bytes = new Uint8Array(str.length * 2);
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            bytes[i * 2] = code & 0xff;
            bytes[i * 2 + 1] = code >> 8;
        }
        return bytes;
    }

    async #decrypt(data) {
        const key = await crypto.subtle.importKey(
            "raw",
            this.#ENCRYPTION_KEY,
            { name: "AES-CBC" },
            false,
            ["decrypt"]
        );

        return crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: this.#ENCRYPTION_KEY
            },
            key,
            data
        );
    }

    #readMetadata(reader, expectedType) {
        const num1 = reader.readUInt64();

        if ((num1 & 0xFFFFFFFFFFFFFFn) !== 27981915666277746n) {
            throw new Error("Expected correct file format.");
        }

        const typeByte = Number((num1 >> 56n) & 0xFFn);
        if (!Object.values(this.#FileType).includes(typeByte) || typeByte === this.#FileType.None) {
            throw new Error("Found invalid file type.");
        }

        const result = {
            type: typeByte,
            typeName: this.#FileTypeNames[typeByte],
            revision: reader.readUInt32(),
            isFavorite: (reader.readUInt64() & 1n) === 1n
        };

        if (result.type != expectedType) {
            throw new Error("Expected type " + this.#FileTypeNames[expectedType] + " but found " + result.typeName);
        } else {
            return result;
        }
    }
}