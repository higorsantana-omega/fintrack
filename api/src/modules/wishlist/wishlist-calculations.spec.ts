import {
  WishlistLinkSnapshot,
  getItemLowestPrice,
  getLinkPriceSummary,
  getPlannedReminder,
  getStillWantedReminder,
  hasPlannedDateChanged,
  isReminderDue,
  toPlannedDate,
} from './wishlist-calculations';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

function planned(month: string, plannedDay?: number) {
  return toPlannedDate(month, plannedDay);
}

describe('toPlannedDate', () => {
  it('uses the first day of the month and no day when none is given', () => {
    expect(planned('2026-12')).toEqual({
      plannedMonth: day('2026-12-01'),
      plannedDay: null,
    });
  });

  it('keeps the chosen day as a full calendar date', () => {
    expect(planned('2026-12', 15)).toEqual({
      plannedMonth: day('2026-12-01'),
      plannedDay: day('2026-12-15'),
    });
  });

  it('moves a day past the end of the month to the last day', () => {
    expect(planned('2027-02', 31).plannedDay).toEqual(day('2027-02-28'));
    expect(planned('2028-02', 31).plannedDay).toEqual(day('2028-02-29'));
  });
});

describe('getPlannedReminder', () => {
  it('AE2: a planned day in the future is the reminder', () => {
    expect(
      getPlannedReminder(planned('2026-12', 15), day('2026-12-10')),
    ).toEqual(day('2026-12-15'));
  });

  it('AE2: the stored reminder is due once its date has arrived', () => {
    const reminder = day('2026-12-15');

    expect(isReminderDue(reminder, day('2026-12-10'))).toBe(false);
    expect(isReminderDue(reminder, day('2026-12-15'))).toBe(true);
    expect(isReminderDue(reminder, day('2026-12-17'))).toBe(true);
  });

  it('AE4: the planned month in progress, without a day, reminds tomorrow', () => {
    expect(getPlannedReminder(planned('2026-11'), day('2026-11-20'))).toEqual(
      day('2026-11-21'),
    );
  });

  it('AE5: a later month without a day reminds on its first day', () => {
    expect(getPlannedReminder(planned('2026-12'), day('2026-11-01'))).toEqual(
      day('2026-12-01'),
    );
  });

  it('AE12: a month already past reminds tomorrow', () => {
    expect(getPlannedReminder(planned('2026-09'), day('2026-11-20'))).toEqual(
      day('2026-11-21'),
    );
  });

  it('clamps day 31 to the last day of February, including leap years', () => {
    expect(
      getPlannedReminder(planned('2027-02', 31), day('2027-01-10')),
    ).toEqual(day('2027-02-28'));
    expect(
      getPlannedReminder(planned('2028-02', 31), day('2028-01-10')),
    ).toEqual(day('2028-02-29'));
  });

  it('a planned date equal to today reminds tomorrow', () => {
    expect(
      getPlannedReminder(planned('2026-12', 15), day('2026-12-15')),
    ).toEqual(day('2026-12-16'));
  });

  it('crosses the year when today is the last day of the planned month', () => {
    expect(getPlannedReminder(planned('2026-12'), day('2026-12-31'))).toEqual(
      day('2027-01-01'),
    );
    expect(
      getPlannedReminder(planned('2026-12', 31), day('2026-12-31')),
    ).toEqual(day('2027-01-01'));
  });

  it('AE3: without a planned date, the reminder is 30 days away', () => {
    expect(getPlannedReminder(null, day('2026-10-02'))).toEqual(
      day('2026-11-01'),
    );
  });
});

describe('getStillWantedReminder', () => {
  it('AE3: moves the reminder 30 days after the answer', () => {
    expect(getStillWantedReminder(day('2026-11-01'))).toEqual(
      day('2026-12-01'),
    );
  });
});

describe('hasPlannedDateChanged', () => {
  it('is false for the same month and day coming from different formats', () => {
    const stored = {
      plannedMonth: new Date('2026-12-01T00:00:00.000Z'),
      plannedDay: new Date('2026-12-15T00:00:00.000Z'),
    };

    expect(hasPlannedDateChanged(stored, planned('2026-12', 15))).toBe(false);
    expect(
      hasPlannedDateChanged(
        { plannedMonth: day('2027-02-01'), plannedDay: day('2027-02-28') },
        planned('2027-02', 31),
      ),
    ).toBe(false);
    expect(hasPlannedDateChanged(planned('2026-12'), planned('2026-12'))).toBe(
      false,
    );
    expect(hasPlannedDateChanged(null, null)).toBe(false);
  });

  it('is true when the month, the day or the presence of a date changes', () => {
    expect(hasPlannedDateChanged(planned('2026-12'), planned('2027-01'))).toBe(
      true,
    );
    expect(
      hasPlannedDateChanged(planned('2026-12', 15), planned('2026-12', 16)),
    ).toBe(true);
    expect(
      hasPlannedDateChanged(planned('2026-12'), planned('2026-12', 1)),
    ).toBe(true);
    expect(hasPlannedDateChanged(null, planned('2026-12'))).toBe(true);
    expect(hasPlannedDateChanged(planned('2026-12'), null)).toBe(true);
  });
});

let linkCounter = 0;

function makeLink(
  storeName: string,
  prices: { value: number; recordedOn: string; createdAt?: string }[],
): WishlistLinkSnapshot {
  linkCounter += 1;

  return {
    id: `link-${linkCounter}`,
    storeName,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    prices: prices.map((price) => ({
      value: price.value,
      recordedOn: day(price.recordedOn),
      createdAt: new Date(
        price.createdAt ?? `${price.recordedOn}T12:00:00.000Z`,
      ),
    })),
  };
}

describe('prices', () => {
  const amazon = () =>
    makeLink('Amazon', [
      { value: 599, recordedOn: '2026-10-01' },
      { value: 549, recordedOn: '2026-10-20' },
    ]);
  const magalu = () =>
    makeLink('Magalu', [{ value: 529, recordedOn: '2026-10-15' }]);

  it('AE7: the item shows the lowest current price with store and date', () => {
    expect(getItemLowestPrice([amazon(), magalu()])).toEqual({
      value: 529,
      storeName: 'Magalu',
      recordedOn: day('2026-10-15'),
    });
  });

  it('AE7: the link shows the variation since the first record', () => {
    expect(getLinkPriceSummary(amazon())).toEqual({
      currentPrice: 549,
      currentRecordedOn: day('2026-10-20'),
      variation: -50,
    });
  });

  it('AE8: a link without records has no price and the lowest is the other store', () => {
    const empty = makeLink('Magalu', []);

    expect(getLinkPriceSummary(empty)).toEqual({
      currentPrice: null,
      currentRecordedOn: null,
      variation: null,
    });
    expect(getItemLowestPrice([amazon(), empty])).toEqual({
      value: 549,
      storeName: 'Amazon',
      recordedOn: day('2026-10-20'),
    });
  });

  it('two records on the same day: the current price is the last created', () => {
    const link = makeLink('Amazon', [
      {
        value: 100,
        recordedOn: '2026-10-05',
        createdAt: '2026-10-05T15:00:00.000Z',
      },
      {
        value: 120,
        recordedOn: '2026-10-05',
        createdAt: '2026-10-05T18:00:00.000Z',
      },
      {
        value: 90,
        recordedOn: '2026-10-05',
        createdAt: '2026-10-05T10:00:00.000Z',
      },
    ]);

    expect(getLinkPriceSummary(link).currentPrice).toBe(120);
    expect(getLinkPriceSummary(link).variation).toBe(30);
  });

  it('does not depend on the order the records come in', () => {
    const link = makeLink('Amazon', [
      { value: 549, recordedOn: '2026-10-20' },
      { value: 599, recordedOn: '2026-10-01' },
    ]);

    expect(getLinkPriceSummary(link).currentPrice).toBe(549);
    expect(getLinkPriceSummary(link).variation).toBe(-50);
  });

  it('a link with a single record has no variation', () => {
    expect(getLinkPriceSummary(magalu())).toEqual({
      currentPrice: 529,
      currentRecordedOn: day('2026-10-15'),
      variation: null,
    });
  });

  it('an item without any record has no lowest price', () => {
    expect(getItemLowestPrice([])).toBeNull();
    expect(getItemLowestPrice([makeLink('Amazon', [])])).toBeNull();
  });

  it('a variation is exact in cents', () => {
    const link = makeLink('Amazon', [
      { value: 0.3, recordedOn: '2026-10-01' },
      { value: 0.1, recordedOn: '2026-10-02' },
    ]);

    expect(getLinkPriceSummary(link).variation).toBe(-0.2);
  });
});
