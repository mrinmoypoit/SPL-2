import React from 'react'
import ProductCategoryPage from './ProductCategoryPage'

function LoansPage() {
  return (
    <ProductCategoryPage
      title="Loans"
      subtitle="All loan products synced from the backend database"
      aliases={['loans', 'loan', 'personal loan', 'home loan', 'auto loan', 'business loan']}
    />
  )
}

export default LoansPage
