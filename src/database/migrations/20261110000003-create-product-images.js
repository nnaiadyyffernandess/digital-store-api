'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_images', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // chave estrangeira: aponta para products.id
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // apagar o produto apaga as imagens dele
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false, // caminho relativo da imagem salva no servidor
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_images')
  },
}