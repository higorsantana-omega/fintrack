import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { ItemPanel } from './components/ItemPanel'
import { ItemsList } from './components/ItemsList'
import { ListsColumn } from './components/ListsColumn'
import { ItemModal } from './modals/ItemModal'
import { LinkModal } from './modals/LinkModal'
import { ListModal } from './modals/ListModal'
import { PriceModal } from './modals/PriceModal'
import { WishlistDeleteTarget, useWishlistController } from './useWishlistController'
import { ALL_LISTS } from './wishlistItems'

const GRID_CLASS = 'grid grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,22rem)] gap-4 items-start'

function getDeleteCopy(target: WishlistDeleteTarget) {
  switch (target.kind) {
    case 'list':
      return {
        title: `Tem certeza que deseja excluir a lista "${target.list.name}"?`,
        description: 'Os itens dela, inclusive os comprados e os desistidos, vão para a Geral.'
      }
    case 'item':
      return {
        title: `Tem certeza que deseja excluir "${target.item.name}"?`,
        description: 'Os links e o histórico de preços também serão excluídos. A despesa lançada na compra continua.'
      }
    case 'link':
      return {
        title: `Tem certeza que deseja excluir o link da ${target.link.storeName}?`,
        description: 'O histórico de preços dele também será excluído.'
      }
    case 'price':
      return {
        title: 'Tem certeza que deseja excluir este registro de preço?',
        description: undefined
      }
  }
}

function WishlistSkeleton() {
  return (
    <div id='wishlist-skeleton' aria-busy='true' aria-label='Carregando a wishlist' className={`${GRID_CLASS} animate-pulse`}>
      <div className='space-y-2'>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className='h-11 bg-white rounded-xl' />
        ))}
      </div>

      <ul className='space-y-2'>
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className='h-[74px] bg-white rounded-2xl flex items-center justify-between gap-3 px-4'>
            <div className='space-y-2'>
              <div className='h-3.5 w-32 rounded bg-gray-200' />
              <div className='h-2.5 w-20 rounded bg-gray-200' />
            </div>
            <div className='h-3.5 w-16 rounded bg-gray-200' />
          </li>
        ))}
      </ul>

      <div className='h-64 bg-white rounded-2xl' />
    </div>
  )
}

export function Wishlist() {
  const {
    isLoading,
    lists,
    listId,
    listNames,
    status,
    visibleItems,
    hasItemsInList,
    selectedItem,
    panelRef,
    selectList,
    selectStatus,
    selectItem,
    newItemListId,
    modal,
    openModal,
    closeModal,
    deleteTarget,
    askDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isUpdatingStatus,
    buy,
    giveUp,
    reactivate
  } = useWishlistController()

  const deleteCopy = deleteTarget && getDeleteCopy(deleteTarget)

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <section className='flex-1 bg-gray-100 rounded-2xl p-4 md:p-8'>
        {isLoading && <WishlistSkeleton />}

        {!isLoading && (
          <div className={GRID_CLASS}>
            <ListsColumn
              lists={lists}
              selectedListId={listId}
              status={status}
              onSelectList={selectList}
              onSelectStatus={selectStatus}
              onCreate={() => openModal({ kind: 'list' })}
              onRename={list => openModal({ kind: 'list', list })}
              onDelete={list => askDelete({ kind: 'list', list })}
            />

            <ItemsList
              items={visibleItems}
              status={status}
              selectedItemId={selectedItem?.id ?? null}
              listNames={listId === ALL_LISTS ? listNames : null}
              hasItemsInList={hasItemsInList}
              onSelect={selectItem}
              onCreate={() => openModal({ kind: 'item' })}
            />

            <div ref={panelRef} className='scroll-mt-4 min-w-0'>
              <ItemPanel
                item={selectedItem}
                listName={(selectedItem && listNames.get(selectedItem.wishlistId)) ?? ''}
                isBusy={isUpdatingStatus}
                onBuy={buy}
                onGiveUp={giveUp}
                onReactivate={reactivate}
                onEdit={item => openModal({ kind: 'item', item })}
                onDelete={item => askDelete({ kind: 'item', item })}
                onAddLink={item => openModal({ kind: 'link', item })}
                onEditLink={(item, link) => openModal({ kind: 'link', item, link })}
                onDeleteLink={link => askDelete({ kind: 'link', link })}
                onAddPrice={link => openModal({ kind: 'price', link })}
                onDeletePrice={price => askDelete({ kind: 'price', price })}
              />
            </div>
          </div>
        )}
      </section>

      {modal?.kind === 'list' && (
        <ListModal
          open
          list={modal.list}
          onClose={closeModal}
          onSaved={modal.list ? undefined : list => selectList(list.id)}
        />
      )}
      {modal?.kind === 'item' && (
        <ItemModal
          open
          lists={lists}
          item={modal.item}
          defaultListId={newItemListId}
          onClose={closeModal}
          // A new item is active, so it has to be where the user looks.
          onSaved={modal.item ? undefined : () => selectStatus('ACTIVE')}
        />
      )}
      {modal?.kind === 'link' && <LinkModal open itemId={modal.item.id} link={modal.link} onClose={closeModal} />}
      {modal?.kind === 'price' && <PriceModal open link={modal.link} onClose={closeModal} />}

      {deleteCopy && (
        <ConfirmDeleteModal
          title={deleteCopy.title}
          description={deleteCopy.description}
          isLoading={isDeleting}
          onConfirm={confirmDelete}
          onClose={cancelDelete}
        />
      )}
    </main>
  )
}
