import React from 'react'
import ProductCategoryPage from './ProductCategoryPage'

function DepositsPage() {
  return (
    <ProductCategoryPage
      title="Deposits"
      subtitle="All deposit products synced from the backend database"
      aliases={['deposits', 'deposit', 'fixed deposit', 'recurring deposit', 'term deposit']}
    />
  )
}

export default DepositsPage
