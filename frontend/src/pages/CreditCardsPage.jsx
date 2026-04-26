import React from 'react'
import ProductCategoryPage from './ProductCategoryPage'

function CreditCardsPage() {
  return (
    <ProductCategoryPage
      title="Credit Cards"
      subtitle="All credit card products synced from the backend database"
      aliases={['credit cards', 'credit card', 'cards', 'credit']}
    />
  )
}

export default CreditCardsPage
