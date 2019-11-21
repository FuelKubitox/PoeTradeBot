// https://discordapp.com/oauth2/authorize?client_id=629855707105067008&scope=bot

const Sequelize = require('sequelize');
// Init Database
const sequelize = new Sequelize('users', 'root', 'sd34Nfn-32s', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    transactionType: 'IMMEDIATE',
    // SQLite only
    storage: 'db/database.sqlite',
});

const currList = require('./currency.json');

// require the discord.js module
const Discord = require('discord.js');

// Http Request Module
const request = require('request-promise');

// Url from poe.watch
const urlPoeWatch = 'http://api.poe.watch/';

// Url from poe.com
const urlPoe = 'http://api.pathofexile.com/public-stash-tabs';

// Change ID from Poe.com
let change_id = '0';

// Token
const config = require('./config.json');

// Command Prefix
const PREFIX = "!";

// Pick the Time if the Functions start to run
let startDate;

// create a new Discord client
const client = new Discord.Client();

// User Model
const User = sequelize.define('users', {
    discordID: {
        type: Sequelize.STRING,
        unique: true,
    },
    accountName: {
        type: Sequelize.STRING,
        unique: true,
    },
    color: {
        type: Sequelize.STRING
    }
});

const Channel = sequelize.define('channels', {
    discordServer: {
        type: Sequelize.STRING,
        unique: true,
    },
    channelID: {
        type: Sequelize.STRING,
    }
})

const Items = sequelize.define('items', {
    itemID: {
        type: Sequelize.STRING
    },
    itemPrice: {
        type: Sequelize.STRING
    }
})

const Filters = sequelize.define('filters', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    discordID: {
        type: Sequelize.STRING
    },
    amount: {
        type: Sequelize.INTEGER
    },
    currency: {
        type: Sequelize.STRING
    }
})

const Status = sequelize.define('status', {
    userID: {
        type: Sequelize.STRING
    },
    discordID: {
        type: Sequelize.STRING
    }
})

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
    console.log('Ready!');
    User.sync();
    Channel.sync();
    Items.sync();
    Filters.sync();
    Status.sync();

    request({
        url: 'https://poe.ninja/api/Data/GetStats',
        json: true
    })
        .then(res => {
            change_id = res.next_change_id;
            getItems();
            deleteDate = new Date();
        })
        .catch(err => {
            console.log(err);
        });
});

client.on('message', async message => {
    if (message.content.startsWith(PREFIX)) {
        const input = message.content.slice(PREFIX.length).split(' ');
        const command = input.shift();
        const commandArgs = input.join(' ');
        const splitArgs = commandArgs.split(" ");

        /* Register a User
        -----------------------------------------------------------------------------------
        Only an Administrator or a Moderator can register a new User. The new User will be saved in the
        Sqlite Database with his Discordname and his Accountname in Path of Exile.
        @params
        - Account Path of Exile
        - Discord ID as Tag
        */
        if (command === 'register') {
            if (splitArgs.length === 1) {
                request({
                    url: urlPoeWatch + 'characters?account=' + splitArgs[0].toLowerCase(),
                    json: true,
                })
                    .then(res => {
                        if (Object.keys(res).length === 0) {
                            return message.reply('The Account was not found!');
                        } else {
                            User.create({
                                discordID: message.author.id,
                                accountName: splitArgs[0].toLowerCase(),
                                color: null
                            })
                                .then(() => {
                                    message.reply('Account ' + splitArgs[0] + ' registered.');
                                })
                                .catch(err => {
                                    if (err.name === 'SequelizeUniqueConstraintError') {
                                        message.reply('Account already registered!');
                                    } else {
                                        message.reply('Something went wrong with adding an Account.');
                                    }
                                })
                                .finally(async () => {
                                    await client.fetchUser(message.author.id);
                                })
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });
            } else {
                return message.reply('The Command has the wrong amount of Commands');
            }
            /* Remove a User
            -----------------------------------------------------------------------------------
            Only an Administrator or a Moderator can remove a User.
            @params
            - Discord ID as Tag
            */
        } else if (command === 'unregister') {
            User.destroy({
                where: {
                    discordID: message.author.id
                }
            })
                .then(deleted => {
                    if (deleted) {
                        message.reply('User ' + message.author.username + ' was successfull removed.');
                    } else {
                        message.reply('User ' + message.author.username + ' already removed.');
                    }
                })
                .catch(err => {
                    message.reply('User cant be removed! Maybe he is already removed.');
                    console.log(err);
                })
            /* Add a Channel
            -----------------------------------------------------------------------------------
            If you want that the Bot response in a specific Channel, you need to add a Channel to the Bot.
            So the Bot response to that Channel
            @params
            - Channelname
            */
        } else if (command === 'addchannel') {
            if (message.member.hasPermission(['ADMINISTRATOR'])) {
                if (splitArgs.length === 1) {
                    const channel = message.guild.channels.find(val => val.name === splitArgs[0].toLowerCase());
                    if (channel) {
                        Channel.create({
                            discordServer: message.guild.id,
                            channelID: channel.id,
                        })
                            .then(() => {
                                message.reply('Bot added to Channel');
                            })
                            .catch(err => {
                                message.reply('Cant add Bot to Channel!');
                                console.log(err);
                            });
                    } else {
                        return message.reply('Cant find the Channel on the Server.');
                    }
                } else {
                    return message.reply('Wrong amount of Parameters. You need to add only the Channel Name you want to add.');
                }
            }
            /* Remove a Channel
            -----------------------------------------------------------------------------------
            Remove a Channel from the Bot
            @params
            - Channelname
            */
        } else if (command === 'removechannel') {
            if (message.member.hasPermission(['ADMINISTRATOR'])) {
                if (splitArgs.length === 1) {
                    const channel = message.guild.channels.find(val => val.name === splitArgs[0].toLowerCase());
                    if (channel) {
                        Channel.destroy({
                            where: {
                                discordServer: message.guild.id,
                                channelID: channel.id,
                            }
                        })
                            .then(() => {
                                message.reply('Bot successfully removed from that Channel.');
                            })
                            .catch(err => {
                                message.reply('Cant find Channel, Bot isnt in that Channel or an Error occured!');
                                console.log(err);
                            })
                    } else {
                        console.log('Cant find Channel ' + splitArgs[0]);
                    }

                } else {
                    return message.reply('Wrong amount of Parameters. You need to add only the Channel Name you want to remove.');
                }
            }
            /* Change Color of User Border Message
            -----------------------------------------------------------------------------------
            Every User can change his own Color in the shown Message. The left Border in the
            Message will change. You have to pass the Hexcode.
            @params
            - Hexcode(without #)
            */
        } else if (command === 'changecolor') {
            if (splitArgs.length === 1) {
                let color;
                if (splitArgs[0].length === 6) {
                    if (/[0-9a-f]+/.test(splitArgs[0])) {
                        color = splitArgs[0];
                    } else {
                        return message.reply('Color is not a Hexcode.');
                    }
                } else {
                    return message.reply('The Color has the wrong Length.');
                }
                User.update({
                    color: color.toString()
                },
                    {
                        where: {
                            discordID: message.author.id
                        }
                    })
                    .then(() => {
                        message.reply('Color changed.');
                    })
                    .catch(err => {
                        message.reply('Couldnt change the Color of the User.');
                        console.log(err);
                    })
            } else {
                return message.reply('Wrong amount of Parameters.');
            }
        } else if (command === 'addfilter') {
            if (message.member.hasPermission(['ADMINISTRATOR'])) {
                if (splitArgs.length === 2) {
                    if (Number.isInteger(parseInt(splitArgs[0]))) {
                        const curr = currList.find(val => val.name === splitArgs[1]);

                        if (curr) {
                            Filters.create({
                                discordID: message.guild.id,
                                amount: parseInt(splitArgs[0]),
                                currency: curr.short
                            })
                                .then(() => {
                                    message.reply('Filter created!');
                                })
                                .catch(err => {
                                    message.reply('Cannot create Filter!');
                                    console.log(err);
                                });
                            return;
                        } else {
                            return message.reply('Currency not found!');
                        }
                    } else {
                        message.reply('Amount is not a Number.');
                    }
                } else {
                    message.reply('Wrong amount of Parameters.');
                }
            } else {
                message.reply('You dont have the Permission to do that.');
            }
        } else if (command === 'removefilter') {
            if (message.member.hasPermission(['ADMINISTRATOR'])) {
                if (splitArgs.length === 1) {
                    if (Number.isInteger(parseInt(splitArgs[0]))) {
                        Filters.findOne({
                            where: {
                                id: parseInt(splitArgs[0])
                            }
                        })
                            .then(res => {
                                if (res.discordID === message.guild.id) {
                                    Filters.destroy({
                                        where: {
                                            id: parseInt(splitArgs[0])
                                        }
                                    })
                                        .then(() => {
                                            message.reply('Filter with ID ' + splitArgs[0] + ' deleted.');
                                        })
                                        .catch(err => {
                                            message.reply('Cannot delete Filter!');
                                            console.log(err);
                                        });
                                }
                            })
                            .catch(err => {
                                console.log(err);
                            })

                    } else {
                        message.reply('The ID is not a Number!');
                    }
                } else {
                    message.reply('Wront amount of Parameters.');
                }
            } else {
                message.reply('You dont have the Permission to do that.');
            }
        } else if (command === 'listfilters') {
            if (message.member.hasPermission(['ADMINISTRATOR'])) {
                Filters.findAll({
                    where: {
                        discordID: message.guild.id
                    }
                })
                    .then(filters => {
                        filters.forEach(filter => {
                            message.author.send('ID: ' + filter.id + '\t Amount: ' + filter.amount + '\t Currency: ' + filter.currency);
                        });
                    })
                    .catch(err => {
                        message.reply('Cant get List of Filters');
                        console.log(err);
                    })
            }
        } else if (command === 'disable') {
            if (message.member.hasPermission(['KICK_MEMBERS'])) {
                if (splitArgs.length === 1) {
                    // Returns the ID from the Tag from Discord
                    const arrId = /<@!?([0-9]*)>/.exec(splitArgs[0]);
                    let realUserId;
                    if (arrId != null) {
                        userId = arrId[1];
                        realUserId = message.guild.members.get(userId).user
                    } else {
                        return message.reply('Did you use the Tag @ for the Discorduser?');
                    }
                    Status.destroy({
                        where: {
                            userID: realUserId.id,
                            discordID: message.guild.id
                        }
                    })
                        .then(deleted => {
                            if (deleted) {
                                message.reply('User ' + realUserId.username + ' disabled on this Discord.');
                            } else {
                                message.reply('User ' + realUserId.username + ' already disabled.');
                            }
                        })
                        .catch(err => {
                            console.log(err);
                        })
                } else {
                    message.reply('Wrong amount of Parameters.');
                }
            } else {
                message.reply('You dont have the Permission to do that!');
            }
        } else if (command === 'enable') {
            if (message.member.hasPermission(['KICK_MEMBERS'])) {
                if (splitArgs.length === 1) {
                    // Returns the ID from the Tag from Discord
                    const arrId = /<@!?([0-9]*)>/.exec(splitArgs[0]);
                    let realUserId;
                    if (arrId != null) {
                        userId = arrId[1];
                        realUserId = message.guild.members.get(userId).user
                    } else {
                        return message.reply('Did you use the Tag @ for the Discorduser?');
                    }
                    const registered = await User.findOne({
                        where: {
                            discordID: realUserId.id
                        }
                    });
                    if (registered) {
                        Status.create({
                            userID: realUserId.id,
                            discordID: message.guild.id
                        })
                            .then(res => {
                                if (res) {
                                    message.reply('User ' + realUserId.username + ' enabled on this Discord.');
                                } else {
                                    message.reply('User ' + realUserId.username + ' already enabled.');
                                }
                            })
                            .catch(err => {
                                console.log(err);
                            })
                            .finally(async () => {
                                await client.fetchUser(realUserId.id);
                            })
                    } else {
                        message.reply('User is not registered.');
                    }
                } else {
                    message.reply('Wrong amount of Parameters.');
                }
            } else {
                message.reply('You dont have the Permission to do that!');
            }
            /* List all Users of the Server
            -----------------------------------------------------------------------------------
            You can get all Users on the Server, that are registered, with that Command. You get
            the Users Name and his Color. The Output is whispered.
            @params
            */
        } else if (command === 'listusers') {
            if (message.member.hasPermission(['KICK_MEMBERS'])) {
                Status.findAll({
                    where: {
                        discordID: message.guild.id
                    }
                })
                    .then(users => {
                        users.forEach(user => {
                            client.fetchUser(user.userID)
                                .then(member => {
                                    message.guild.fetchMember(member)
                                        .then(guilduser => {
                                            if (guilduser) {
                                                message.author.send('Username: ' + guilduser.displayName + "\t Color: " + user.color);
                                            }
                                        });
                                });
                        });
                    })
                    .catch(err => {
                        console.log(err);
                    })
            } else {
                return message.reply('You dont have the Permission to do that.');
            }
            /* Help
            -----------------------------------------------------------------------------------
            Shows the Help in Discord. The Output will be whispered.
            @params
            */
        } else if (command === 'help') {
            return message.author.send('\n"!register PathOfExileAccountname - Register a new User for the Bot \n' +
                '"!unregister" - Unregister/Remove a User from the Bot \n' +
                '"!enable @Discordname" - Activates a User for this Discord \n' +
                '"!disable @Discordname" - Deactivate a User for this Discord \n' +
                '"!addchannel Channelname" - Add the Bot to a Channel \n' +
                '"!removechannel Channelname" - Remove the Bot from a Channel \n' +
                '"!changecolor Hexcode(without #) - Changes the left Border Color. \n' +
                '"!addfilter Amount Currency - Adds Filter. Everything below the Amount and with given Currency will be filtered. \n' +
                '"!removefilter ID - Removes the Filter with the ID. \n' +
                '"!listfilters - Get a List of Filters. \n' +
                '"!listusers" - Outputs a List with all enabled Users in the Bot \n' +
                '"!help" - This Help');
        }
    }
});

// login to Discord with your app's token
client.login(config.token);

/* Entry Point
-----------------------------------------------------------------------------------
With this Function you will enter the Bot to ask for changes. It will get the Items
of Poe Trade API.
*/
function getItems() {
    startDate = Date.now();

    // Request Poe API with new change_id
    console.log('downloading...')
    request({
        url: urlPoe + '?id=' + change_id,
        json: true,
    })
        .then(res => {
            console.log('...downloaded');
            if (res.next_change_id != change_id) {
                change_id = res.next_change_id;

                User.findAll()
                    .then(users => {
                        for (let user of users) {
                            for (let account of res.stashes) {
                                if (account.accountName != null && user.accountName.toLowerCase() === account.accountName.toLowerCase()) {
                                    console.log('Changes detected for ' + account.accountName);
                                    postMessage(account.items, user);
                                }
                            }
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    })
            }
        })
        .catch(err => {
            console.log(err);
        })
        .finally(() => {
            endDate = Date.now();
            console.log('Seconds: ' + Math.floor((Date.now() - startDate) / 1000));
            setTimeout(() => {
                getItems();
            }, 3000);
        });
}

/* Post Message
-----------------------------------------------------------------------------------
Here the Message will be posted if everything Matches. But before the Function
renderMessage will be called to render the Post.
@params
- Object with all Items
- User Object of the Database
*/
function postMessage(items, userDiscord) {
    Items.findAll()
        .then(async itemsDb => {
            for (let item of items) {
                if (item.league === 'Standard') continue;

                let price = 0;
                let currency = '';

                // Parse Currency Text
                if ('note' in item) {
                    const arr = item.note.split(' ');
                    if (arr[1].includes('.')) {
                        price = parseFloat(arr[1]);
                    } else {
                        price = parseInt(arr[1]);
                    }
                    currency = arr[2];
                }

                const itemDb = itemsDb.filter(val => val.itemID === item.id);

                if (itemDb.length === 1) {
                    if (itemDb[0].itemPrice === item.note) {
                        continue;
                    } else {
                        Items.update({
                            itemPrice: item.note
                        },
                            {
                                where: {
                                    itemID: item.id
                                }
                            })
                            .then(() => { })
                    }
                } else {
                    Items.create({
                        itemID: item.id,
                        itemPrice: item.note
                    });
                }

                Channel.findAll()
                    .then(async channels => {
                        for (let channel of channels) {
                            console.log('Channel: ' + channel.discordServer);
                            const guild = client.guilds.find(val => val.id === channel.discordServer);
                            const enabled = await Status.findOne({
                                where: {
                                    userID: userDiscord.discordID,
                                    discordID: guild.id
                                }
                            });
                            if (enabled) {
                                console.log('User enabled: ' + userDiscord.discordID);
                                if (guild.member(userDiscord.discordID)) {
                                    console.log('User is a Member of the Guild.');
                                    const filters = await Filters.findAll({ where: { discordID: channel.discordServer } });
                                    let filtered = false;
                                    for (let filter of filters) {
                                        if (filter.discordID === channel.discordServer) {
                                            if (price <= filter.amount && filter.currency === currency || filter.amount === 0 && currency === filter.currency) {
                                                filtered = true;
                                            }
                                        }
                                    }
                                    if (filtered) {
                                        console.log('Item filtered for ' + channel.discordServer);
                                        continue;
                                    }
                                    renderMessage(item, price, currency, userDiscord, channel);
                                }
                            } else {
                                console.log('User disabled: ' + userDiscord.discordID);
                            }
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });
            }
        })
        .catch(err => {
            console.log(err);
        })
}

/* Render a Message
-----------------------------------------------------------------------------------
Renders the Message of the Post with Embedded Messages in Discord.
@params
- the Item itself
- parsed Price Amount
- parsed Price in Currency
- User Object of the Database
- the Channel iteself
*/
function renderMessage(item, price, currency, userDiscord, channel) {
    client.fetchUser(userDiscord.discordID)
        .then(user => {
            const curr = currList.find(val => val.short === currency);
            const richEmbedded = {
                color: userDiscord.color != null ? parseInt(userDiscord.color, 16) : null,
                title: user.username + ' wants to sell something! Price: ' + price + ' ' + curr.name,
                thumbnail: {
                    url: item.icon,
                },
                fields: parseItemInformation(item)
            }

            channelDiscord = client.channels.find(val => val.id === channel.channelID);
            if (channelDiscord) {
                channelDiscord.send({ embed: richEmbedded });
            } else {
                console.log('Cant find Channel ' + channel.channelID);
            }
        });
}

function parseItemInformation(item) {
    const arr = [];

    if (item.name && item.name != '') {
        arr.push({
            name: 'Name',
            value: item.name,
            inline: true
        })
    }

    arr.push({
        name: 'Type',
        value: item.typeLine,
        inline: true
    })
    arr.push({
        name: 'League',
        value: item.league,
        inline: true
    })
    if (item.sockets) {
        arr.push({
            name: 'Sockets',
            value: item.sockets.length.toString(),
            inline: true
        })
        let x = 0;
        const links = [];
        links.push(1);
        for (let i = 1; i < item.sockets.length; i++) {
            if (item.sockets[i].group === x) {
                links[x]++;
            } else {
                links.push(1);
                x = item.sockets[i].group;
            }
        }
        arr.push({
            name: 'Links',
            value: links.join('-'),
            inline: true
        })
        const colors = { Red: 0, Green: 0, Blue: 0, White: 0, Abyss: 0 }
        for (let socket of item.sockets) {
            if (socket.sColour === 'R') colors.Red++;
            else if (socket.sColour === 'G') colors.Green++;
            else if (socket.sColour === 'B') colors.Blue++;
            else if (socket.sColour === 'W') colors.White++;
            else if (socket.sColour === 'A') colors.Abyss++;
        }
        let socketcolor = [];
        if (colors.Red > 0) socketcolor.push('Red: ' + colors.Red.toString());
        if (colors.Green > 0) socketcolor.push('Green: ' + colors.Green.toString());
        if (colors.Blue > 0) socketcolor.push('Blue: ' + colors.Blue.toString());
        if (colors.White > 0) socketcolor.push('White: ' + colors.White.toString());
        if (colors.Abyss > 0) socketcolor.push('Abyss: ' + colors.Abyss.toString());
        arr.push({
            name: 'Socket Colors',
            value: socketcolor.join(' '),
            inline: true
        })
    }

    if (item.corrupted) {
        arr.push({
            name: 'Corrupted',
            value: 'Yes',
            inline: true
        });
    }

    if (item.shaper) {
        arr.push({
            name: 'Shaper',
            value: 'Yes',
            inline: true
        });
    }

    if (item.elder) {
        arr.push({
            name: 'Elder',
            value: 'Yes',
            inline: true
        });
    }

    if (!item.identified) return arr;

    if (item.properties) {
        for (let property of item.properties) {
            let field = {};
            if (property.name.includes('%')) {
                let str = property.name;
                for (let i = 0; i < (property.name.match(/\%/g) || []).length; i++) {
                    str = str.replace('%' + i, property.values[i][0])
                }
                field['name'] = 'Property';
                field['value'] = str;
                field['inline'] = true;
                arr.push(field);
                continue;
            }
            if (property.name) {
                field['name'] = property.name;
            } else {
                field['name'] = 'empty';
            }
            if (property.values[0] != null && property.values[0][0] != null) {
                field['value'] = property.values[0][0];
            } else {
                field['value'] = 'empty';
            }
            field['inline'] = true;
            arr.push(field);
        }
    }

    if (item.requirements) {
        for (let require of item.requirements) {
            arr.push({
                name: require.name,
                value: require.values[0][0],
                inline: true
            })
        }
    }
    if (item.enchantMods) {
        arr.push({
            name: 'Enchant',
            value: item.enchantMods[0]
        });
    }

    if (item.implicitMods) {
        for (let mod of item.implicitMods) {
            arr.push({
                name: 'Implicit',
                value: mod.toString(),
                inline: true,
            })
        }
    }

    if (item.explicitMods) {
        for (let mod of item.explicitMods) {
            arr.push({
                name: 'Explicit',
                value: mod.toString(),
                inline: true,
            })
        }
    }

    if (item.utilityMods) {
        for (let mod of item.utilityMods) {
            arr.push({
                name: 'Utility',
                value: mod.toString(),
                inline: true,
            })
        }
    }

    if (item.craftedMods) {
        for (let mod of item.craftedMods) {
            arr.push({
                name: 'Crafted',
                value: mod.toString(),
                inline: true
            })
        }
    }

    return arr;
}

/*function deleteOldItems() {
    Items.findAll()
        .then(items => {
            const month = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 4);
            const week = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
            items.forEach(item => {
                if (new Date(item.createdAt) < month) {
                    if (new Date(item.updatedAt) < week) {
                        Items.destroy({
                            where: {
                                itemID: item.itemID
                            }
                        });
                    }
                }
            });
        })
        .catch(err => {
            console.log(err);
        })
}*/