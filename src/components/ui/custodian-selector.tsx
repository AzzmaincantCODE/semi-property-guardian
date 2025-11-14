import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Search, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { custodianService, Custodian } from "@/services/custodianService";

interface CustodianSelectorProps {
  value: string;
  onChange: (custodianName: string, custodianData?: Custodian) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const CustodianSelector = ({
  value,
  onChange,
  placeholder = "Search for custodian...",
  label = "Custodian Name",
  required = false,
  className
}: CustodianSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustodian, setSelectedCustodian] = useState<Custodian | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch custodians with search
  const { data: custodians = [], isLoading } = useQuery({
    queryKey: ['custodians-search', searchTerm],
    queryFn: () => custodianService.getAll({ 
      search: searchTerm,
      is_active: true,
      limit: 20 
    }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });

  // Filter custodians based on search term
  const filteredCustodians = custodians.filter(custodian =>
    custodian.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    custodian.custodian_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (custodian.department_name && custodian.department_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle custodian selection
  const handleSelectCustodian = (custodian: Custodian) => {
    setSelectedCustodian(custodian);
    setSearchTerm(custodian.name);
    setIsOpen(false);
    onChange(custodian.name, custodian);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    // If user clears the input, clear selection
    if (!newValue) {
      setSelectedCustodian(null);
      onChange("");
    } else {
      // If user types something that doesn't match selected custodian, clear selection
      if (selectedCustodian && newValue !== selectedCustodian.name) {
        setSelectedCustodian(null);
        onChange(newValue);
      }
    }
    
    setIsOpen(true);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchTerm && selectedCustodian) {
      setSearchTerm(selectedCustodian.name);
    }
  };

  // Handle input blur with delay to allow clicking on dropdown items
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize with value if provided
  useEffect(() => {
    if (value && !selectedCustodian) {
      setSearchTerm(value);
    }
  }, [value, selectedCustodian]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {label && (
        <Label htmlFor="custodian-selector" className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            id="custodian-selector"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="pl-10 pr-10"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Loading custodians...
              </div>
            ) : filteredCustodians.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {searchTerm ? "No custodians found" : "Start typing to search custodians"}
              </div>
            ) : (
              <div className="py-1">
                {filteredCustodians.map((custodian) => (
                  <button
                    key={custodian.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handleSelectCustodian(custodian)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{custodian.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {custodian.custodian_no}
                            {custodian.department_name && (
                              <>
                                {" • "}
                                <Building2 className="inline h-3 w-3 mr-1" />
                                {custodian.department_name}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedCustodian?.id === custodian.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected custodian info */}
      {selectedCustodian && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <div className="text-sm">
              <span className="font-medium text-green-800">Selected: {selectedCustodian.name}</span>
              <div className="text-green-600">
                {selectedCustodian.custodian_no}
                {selectedCustodian.department_name && ` • ${selectedCustodian.department_name}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
