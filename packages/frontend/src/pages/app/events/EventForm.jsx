import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { eventsApi, inventoryApi, animalsApi } from '../../../services/api';

const eventTypes = [
  { value: 'feeding', label: 'Feeding', description: 'Feed animals', hasInventory: true },
  { value: 'treatment', label: 'Treatment', description: 'Medical treatment', hasInventory: true },
  { value: 'purchase', label: 'Purchase', description: 'Buy supplies', hasInventory: true, isReceiving: true },
  { value: 'sale', label: 'Sale', description: 'Sell animals/products', hasRevenue: true },
  { value: 'maintenance', label: 'Maintenance', description: 'Equipment/facility maintenance', hasCost: true },
  { value: 'labor', label: 'Labor', description: 'Labor/work hours', hasLabor: true },
  { value: 'breeding', label: 'Breeding', description: 'Breeding event' },
  { value: 'birth', label: 'Birth', description: 'Animal birth' },
  { value: 'death', label: 'Death', description: 'Animal death/loss' },
  { value: 'harvest', label: 'Harvest', description: 'Harvest crops/products', hasRevenue: true },
  { value: 'transfer', label: 'Transfer', description: 'Move inventory between sites' },
  { value: 'adjustment', label: 'Adjustment', description: 'Manual inventory adjustment' },
  { value: 'custom', label: 'Custom', description: 'User-defined event' },
];

export default function EventForm() {
  const navigate = useNavigate();
  const { currentSite } = useSite();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [animalGroups, setAnimalGroups] = useState([]);

  const [formData, setFormData] = useState({
    type: 'feeding',
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
    status: 'completed',
    notes: '',
    // Animal group (for feeding, treatment, etc.)
    animalGroupId: '',
    animalGroupName: '',
    animalCount: 0,
    usePerAnimalQuantity: true, // When true, multiply qty per animal by group count
    // Inventory used (for feeding, treatment)
    inventoryUsed: [],
    // Inventory received (for purchase)
    inventoryReceived: [],
    // Financial
    totalCost: '',
    totalRevenue: '',
    // Vendor (for purchase)
    vendor: {
      name: '',
      invoiceNumber: '',
    },
    // Labor
    labor: {
      hours: '',
      rate: '',
      workerName: '',
    },
    // Auto-post
    autoPost: true,
  });

  const selectedType = eventTypes.find((t) => t.value === formData.type);

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (currentSite?.id) {
      fetchAnimalGroups();
    }
  }, [currentSite]);

  const fetchInventoryItems = async () => {
    try {
      const response = await inventoryApi.list({ activeOnly: true });
      setInventoryItems(response.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  };

  const fetchAnimalGroups = async () => {
    if (!currentSite?.id) return;

    try {
      const response = await animalsApi.listGroups({ siteId: currentSite.id });
      setAnimalGroups(response.data?.groups || []);
    } catch (err) {
      console.error('Failed to fetch animal groups:', err);
    }
  };

  const handleGroupChange = (groupId) => {
    if (!groupId) {
      setFormData((prev) => ({
        ...prev,
        animalGroupId: '',
        animalGroupName: '',
        animalCount: 0,
      }));
      return;
    }

    const group = animalGroups.find((g) => g.id === groupId);
    if (group) {
      setFormData((prev) => ({
        ...prev,
        animalGroupId: groupId,
        animalGroupName: group.name,
        animalCount: group.animalCount || 0,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const addInventoryLine = (section) => {
    setFormData((prev) => ({
      ...prev,
      [section]: [
        ...prev[section],
        { itemId: '', itemName: '', quantity: '', unit: '', unitCost: '', totalCost: 0, qtyPerAnimal: '' },
      ],
    }));
  };

  const updateInventoryLine = (section, index, field, value) => {
    setFormData((prev) => {
      const items = [...prev[section]];
      items[index] = { ...items[index], [field]: value };

      // Calculate quantity based on per-animal mode
      const recalculateQuantityAndCost = () => {
        const qtyPerAnimal = parseFloat(items[index].qtyPerAnimal) || 0;
        const directQty = parseFloat(items[index].quantity) || 0;
        const cost = parseFloat(items[index].unitCost) || 0;

        // If using per-animal mode and we have a group selected
        if (prev.usePerAnimalQuantity && prev.animalCount > 0 && section === 'inventoryUsed') {
          // Calculate total from per-animal quantity
          const totalQty = qtyPerAnimal * prev.animalCount;
          items[index].quantity = totalQty > 0 ? totalQty : '';
          items[index].totalCost = totalQty * cost;
        } else {
          // Use direct quantity
          items[index].totalCost = directQty * cost;
        }
      };

      // Auto-calculate when relevant fields change
      if (field === 'qtyPerAnimal' || field === 'quantity' || field === 'unitCost') {
        recalculateQuantityAndCost();
      }

      // Auto-fill item details when item selected
      if (field === 'itemId' && value) {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) {
          items[index].itemName = item.name;
          items[index].unit = item.unit;
          items[index].unitCost = item.defaultCostPerUnit || '';
          recalculateQuantityAndCost();
        }
      }

      return { ...prev, [section]: items };
    });
  };

  // Recalculate all inventory lines when group or per-animal mode changes
  const recalculateAllInventoryLines = () => {
    setFormData((prev) => {
      if (!prev.usePerAnimalQuantity || prev.animalCount === 0) {
        return prev;
      }

      const updatedItems = prev.inventoryUsed.map((item) => {
        const qtyPerAnimal = parseFloat(item.qtyPerAnimal) || 0;
        const cost = parseFloat(item.unitCost) || 0;
        const totalQty = qtyPerAnimal * prev.animalCount;
        return {
          ...item,
          quantity: totalQty > 0 ? totalQty : item.quantity,
          totalCost: totalQty > 0 ? totalQty * cost : item.totalCost,
        };
      });

      return { ...prev, inventoryUsed: updatedItems };
    });
  };

  const removeInventoryLine = (section, index) => {
    setFormData((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const calculateTotalCost = () => {
    if (selectedType?.hasLabor) {
      const hours = parseFloat(formData.labor.hours) || 0;
      const rate = parseFloat(formData.labor.rate) || 0;
      return hours * rate;
    }

    if (selectedType?.hasInventory && !selectedType?.isReceiving) {
      return formData.inventoryUsed.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    }

    if (selectedType?.isReceiving) {
      return formData.inventoryReceived.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    }

    return parseFloat(formData.totalCost) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentSite?.id) {
      setError('Please select a site first');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        siteId: currentSite.id,
        type: formData.type,
        eventDate: formData.eventDate,
        description: formData.description,
        status: formData.status,
        notes: formData.notes,
        autoPost: formData.autoPost,
      };

      // Add animal group info if selected
      if (formData.animalGroupId) {
        payload.animalGroupId = formData.animalGroupId;
        payload.animalGroupName = formData.animalGroupName;
        payload.animalCount = formData.animalCount;
      }

      // Add inventory used
      if (selectedType?.hasInventory && !selectedType?.isReceiving && formData.inventoryUsed.length > 0) {
        payload.inventoryUsed = formData.inventoryUsed
          .filter((item) => item.itemId && item.quantity)
          .map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            unitCost: parseFloat(item.unitCost) || 0,
            totalCost: item.totalCost,
          }));
      }

      // Add inventory received (purchase)
      if (selectedType?.isReceiving && formData.inventoryReceived.length > 0) {
        payload.inventoryReceived = formData.inventoryReceived
          .filter((item) => item.itemId && item.quantity)
          .map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            unitCost: parseFloat(item.unitCost) || 0,
            totalCost: item.totalCost,
          }));

        if (formData.vendor.name) {
          payload.vendor = formData.vendor;
        }
      }

      // Add labor
      if (selectedType?.hasLabor) {
        payload.labor = {
          hours: parseFloat(formData.labor.hours) || 0,
          rate: parseFloat(formData.labor.rate) || 0,
          workerName: formData.labor.workerName,
        };
      }

      // Add cost/revenue
      payload.totalCost = calculateTotalCost();
      if (selectedType?.hasRevenue) {
        payload.totalRevenue = parseFloat(formData.totalRevenue) || 0;
      }

      await eventsApi.create(payload);
      navigate('/app/events');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to log an event.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Log Event</h1>
        <p className="text-gray-600">Record an activity at {currentSite.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Event Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input"
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          {/* Animal Group Selector - for feeding, treatment, breeding events */}
          {(selectedType?.hasInventory || formData.type === 'breeding' || formData.type === 'treatment') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <h3 className="font-medium text-blue-900">Animal Group</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Select Group</label>
                  <select
                    value={formData.animalGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="input"
                  >
                    <option value="">No group selected</option>
                    {animalGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.animalCount || 0} animals)
                      </option>
                    ))}
                  </select>
                </div>

                {formData.animalGroupId && (
                  <div className="flex items-end">
                    <div className="bg-white rounded-lg px-4 py-2 border border-blue-200">
                      <p className="text-sm text-gray-500">Livestock in group</p>
                      <p className="text-2xl font-bold text-blue-600">{formData.animalCount}</p>
                    </div>
                  </div>
                )}
              </div>

              {formData.animalGroupId && selectedType?.hasInventory && (
                <label className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    checked={formData.usePerAnimalQuantity}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, usePerAnimalQuantity: e.target.checked }));
                      if (e.target.checked) {
                        recalculateAllInventoryLines();
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-blue-800">
                    Calculate quantities per animal (auto-multiply by group size)
                  </span>
                </label>
              )}
            </div>
          )}

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the event"
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional details..."
              rows={3}
              className="input"
            />
          </div>
        </div>

        {/* Inventory Used (for feeding, treatment) */}
        {selectedType?.hasInventory && !selectedType?.isReceiving && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Inventory Used</h2>
              <button
                type="button"
                onClick={() => addInventoryLine('inventoryUsed')}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Add Item
              </button>
            </div>

            {/* Per-animal mode info banner */}
            {formData.usePerAnimalQuantity && formData.animalCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800">
                  <strong>Per-animal mode:</strong> Enter quantity per animal. Total will be multiplied by {formData.animalCount} animals in {formData.animalGroupName}.
                </p>
              </div>
            )}

            {formData.inventoryUsed.length === 0 ? (
              <p className="text-gray-500 text-sm">No items added. Click "Add Item" to track inventory usage.</p>
            ) : (
              <div className="space-y-3">
                {formData.inventoryUsed.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className={formData.usePerAnimalQuantity && formData.animalCount > 0 ? 'col-span-3' : 'col-span-4'}>
                        <label className="label text-xs">Item</label>
                        <select
                          value={item.itemId}
                          onChange={(e) => updateInventoryLine('inventoryUsed', index, 'itemId', e.target.value)}
                          className="input py-2 text-sm"
                        >
                          <option value="">Select item...</option>
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Per-animal quantity input - only shown in per-animal mode */}
                      {formData.usePerAnimalQuantity && formData.animalCount > 0 && (
                        <div className="col-span-2">
                          <label className="label text-xs text-green-700">Per Animal</label>
                          <input
                            type="number"
                            value={item.qtyPerAnimal}
                            onChange={(e) => updateInventoryLine('inventoryUsed', index, 'qtyPerAnimal', e.target.value)}
                            className="input py-2 text-sm border-green-300 focus:border-green-500 focus:ring-green-500"
                            min="0"
                            step="0.01"
                            placeholder="0"
                          />
                        </div>
                      )}

                      <div className="col-span-2">
                        <label className="label text-xs">
                          {formData.usePerAnimalQuantity && formData.animalCount > 0 ? 'Total Qty' : 'Quantity'}
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInventoryLine('inventoryUsed', index, 'quantity', e.target.value)}
                          className={`input py-2 text-sm ${formData.usePerAnimalQuantity && formData.animalCount > 0 ? 'bg-gray-100' : ''}`}
                          min="0"
                          step="0.01"
                          readOnly={formData.usePerAnimalQuantity && formData.animalCount > 0}
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="label text-xs">Unit</label>
                        <input
                          type="text"
                          value={item.unit}
                          readOnly
                          className="input py-2 text-sm bg-gray-100"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs">Unit Cost</label>
                        <input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => updateInventoryLine('inventoryUsed', index, 'unitCost', e.target.value)}
                          className="input py-2 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="label text-xs">Total</label>
                        <p className="py-2 text-sm font-bold text-green-700">${(item.totalCost || 0).toFixed(2)}</p>
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeInventoryLine('inventoryUsed', index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Calculation breakdown for per-animal mode */}
                    {formData.usePerAnimalQuantity && formData.animalCount > 0 && item.qtyPerAnimal && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                        <span className="font-medium">{item.qtyPerAnimal} {item.unit}</span> per animal × <span className="font-medium">{formData.animalCount}</span> animals = <span className="font-bold text-gray-900">{item.quantity} {item.unit}</span>
                        {item.unitCost && (
                          <span className="ml-2">
                            @ ${item.unitCost}/{item.unit} = <span className="font-bold text-green-700">${(item.totalCost || 0).toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inventory Received (for purchase) */}
        {selectedType?.isReceiving && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Items Purchased</h2>
              <button
                type="button"
                onClick={() => addInventoryLine('inventoryReceived')}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Add Item
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Vendor Name</label>
                <input
                  type="text"
                  value={formData.vendor.name}
                  onChange={(e) => handleNestedChange('vendor', 'name', e.target.value)}
                  className="input"
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <label className="label">Invoice Number</label>
                <input
                  type="text"
                  value={formData.vendor.invoiceNumber}
                  onChange={(e) => handleNestedChange('vendor', 'invoiceNumber', e.target.value)}
                  className="input"
                  placeholder="Invoice #"
                />
              </div>
            </div>

            {formData.inventoryReceived.length === 0 ? (
              <p className="text-gray-500 text-sm">No items added. Click "Add Item" to add purchased items.</p>
            ) : (
              <div className="space-y-3">
                {formData.inventoryReceived.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="label text-xs">Item</label>
                      <select
                        value={item.itemId}
                        onChange={(e) => updateInventoryLine('inventoryReceived', index, 'itemId', e.target.value)}
                        className="input py-2 text-sm"
                      >
                        <option value="">Select item...</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInventoryLine('inventoryReceived', index, 'quantity', e.target.value)}
                        className="input py-2 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        className="input py-2 text-sm bg-gray-50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Unit Cost</label>
                      <input
                        type="number"
                        value={item.unitCost}
                        onChange={(e) => updateInventoryLine('inventoryReceived', index, 'unitCost', e.target.value)}
                        className="input py-2 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="label text-xs">Total</label>
                      <p className="py-2 text-sm font-medium">${(item.totalCost || 0).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeInventoryLine('inventoryReceived', index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Labor (for labor events) */}
        {selectedType?.hasLabor && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Labor Details</h2>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Worker Name</label>
                <input
                  type="text"
                  value={formData.labor.workerName}
                  onChange={(e) => handleNestedChange('labor', 'workerName', e.target.value)}
                  className="input"
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="label">Hours Worked</label>
                <input
                  type="number"
                  value={formData.labor.hours}
                  onChange={(e) => handleNestedChange('labor', 'hours', e.target.value)}
                  className="input"
                  min="0"
                  step="0.25"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Hourly Rate ($)</label>
                <input
                  type="number"
                  value={formData.labor.rate}
                  onChange={(e) => handleNestedChange('labor', 'rate', e.target.value)}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        )}

        {/* Direct Cost (for maintenance, etc) */}
        {selectedType?.hasCost && !selectedType?.hasLabor && !selectedType?.hasInventory && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Cost</h2>
            <div className="max-w-xs">
              <label className="label">Total Cost ($)</label>
              <input
                type="number"
                name="totalCost"
                value={formData.totalCost}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Revenue (for sales, harvest) */}
        {selectedType?.hasRevenue && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Revenue</h2>
            <div className="max-w-xs">
              <label className="label">Total Revenue ($)</label>
              <input
                type="number"
                name="totalRevenue"
                value={formData.totalRevenue}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Options */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Options</h2>

          <div className="flex items-center gap-4">
            <div>
              <label className="label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="autoPost"
              checked={formData.autoPost}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Auto-post to inventory and accounting ledger
            </span>
          </label>
        </div>

        {/* Summary & Submit */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-700">Estimated Total Cost:</span>
            <span className="text-xl font-bold text-gray-900">
              ${calculateTotalCost().toFixed(2)}
            </span>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/app/events')}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
