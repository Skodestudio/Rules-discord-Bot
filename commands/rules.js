const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
    data: {
        name: 'rules',
        description: 'Displays the server rules with a dropdown list.',
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredServerOwnerRoleId = config.RoleId;
        const member = interaction.guild.members.cache.get(interaction.user.id);

        if (!member.roles.cache.has(requiredServerOwnerRoleId)) {
            return interaction.followUp({ content: 'غير مصرح لك بأستخدام هذا الامر', ephemeral: true });
        }

        const rulesPath = path.join(__dirname, '../rules.json');
        const rulesData = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

        const embed = new EmbedBuilder()
            .setTitle('Server Rules')
            .setDescription('Server Rules Readers')
            .setColor(config.embedColor)
            .setImage(config.imageUrl);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_rule')
            .setPlaceholder('List of rules┃قائمة القوانين ')
            .addOptions(
                rulesData.rules.map(rule => ({
                    label: rule.name,
                    value: rule.file,
                }))
            );

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        await interaction.followUp({ content: 'تم تنفيذ طلبك بنجاح', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });

        const filter = i => i.customId === 'select_rule' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (!i.isStringSelectMenu()) return;

            const selectedFileName = i.values[0];
            const selectedRule = rulesData.rules.find(rule => rule.file === selectedFileName);

            if (!selectedRule) {
                await i.reply({ content: 'The selected rule does not exist.', ephemeral: true });
                return;
            }

            const requiredRoleId = selectedRule.roleId;
            if (!member.roles.cache.has(requiredRoleId)) {
                await i.reply({ content: 'You do not have the required role to view this rule.', ephemeral: true });
                return;
            }

            const ruleFilePath = path.join(__dirname, `../data/${selectedFileName}`);
            if (!fs.existsSync(ruleFilePath)) {
                await i.reply({ content: 'The selected rule file does not exist.', ephemeral: true });
                return;
            }

            const ruleContent = fs.readFileSync(ruleFilePath, 'utf8');

            await i.reply({ content: ruleContent, ephemeral: true });

            try {
                if (!i.replied) {
                    await i.update({ components: [] });
                }
            } catch (error) {
                console.error('Failed to update the interaction:', error);
            }
        });
    },
};
