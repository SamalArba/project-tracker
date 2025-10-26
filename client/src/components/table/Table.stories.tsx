import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './Table';

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Table>;

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
  { key: 'email', label: 'Email' }
];

const rows = [
  { name: 'Alice', age: 30, email: 'alice@example.com' },
  { name: 'Bob', age: 22, email: 'bob@example.com' }
];

export const Default: Story = {
  args: {
    columns,
    rows,
    onRowClick: (row: any) => alert(`Clicked: ${row.name}`)
  },
};

export const Empty: Story = {
  args: {
    columns,
    rows: [],
    onRowClick: (row: any) => alert(`Clicked: ${row.name}`)
  },
};


export const ManyRows: Story = {
  args: {
    columns,
    rows: Array.from({ length: 20 }, (_, i) => ({
      name: `User${i + 1}`,
      age: 20 + i,
      email: `user${i + 1}@example.com`
    })),
    onRowClick: (row: any) => alert(`Clicked: ${row.name}`)
  },
};

export const NoColumns: Story = {
  args: {
    columns: [],
    rows,
    onRowClick: (row: any) => alert(`Clicked: ${row.name}`)
  },
};

export const CustomColumnOrder: Story = {
  args: {
    columns: [
      { key: 'email', label: 'Email Address' },
      { key: 'name', label: 'Full Name' },
      { key: 'age', label: 'Years' }
    ],
    rows,
    onRowClick: (row: any) => alert(`Clicked: ${row.name}`)
  },
};

export const WithExtraData: Story = {
  args: {
    columns,
    rows: [
      { name: 'Alice', age: 30, email: 'alice@example.com', city: 'Paris' },
      { name: 'Bob', age: 22, email: 'bob@example.com', country: 'Canada' },
    ],
    onRowClick: (row: any) => alert(`Clicked: ${row.name}`)
  },
};

export const NoOnRowClick: Story = {
  args: {
    columns,
    rows
    // No onRowClick defined
  },
};

