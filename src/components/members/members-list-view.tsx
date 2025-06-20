
"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import type { Member, GDI, MinistryArea, AddMemberFormValues, MemberWriteData, MemberRoleType, Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpNarrowWide, ArrowDownNarrowWide, Info, UserPlus, ListPlus, Loader2, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import MemberDetailsDialog from './member-details-dialog';
import AddMemberForm from './add-member-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface MembersListViewProps {
  initialMembers: Member[]; 
  allMembersForDropdowns: Member[]; 
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
  addSingleMemberAction: (newMemberData: MemberWriteData) => Promise<{ success: boolean; message: string; newMember?: Member }>;
  updateMemberAction: (memberData: Member) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  currentSearchTerm?: string;
}

type SortKey = Exclude<keyof Member, 'email' | 'assignedGDIId' | 'assignedAreaIds' | 'avatarUrl' | 'attendsLifeSchool' | 'attendsBibleInstitute' | 'fromAnotherChurch' | 'baptismDate' | 'roles'> | 'fullName';
type SortOrder = 'asc' | 'desc';

const roleDisplayNames: Record<MemberRoleType, string> = {
  Leader: "Líder",
  Worker: "Obrero",
  GeneralAttendee: "Asistente General",
};

export default function MembersListView({ 
  initialMembers, 
  allMembersForDropdowns,
  allGDIs, 
  allMinistryAreas,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
  addSingleMemberAction,
  updateMemberAction,
  currentPage,
  totalPages,
  pageSize,
  currentSearchTerm = ''
}: MembersListViewProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchInput, setSearchInput] = useState(currentSearchTerm); 
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isProcessingMember, startMemberTransition] = useTransition();
  const { toast } = useToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  useEffect(() => {
    setSearchInput(currentSearchTerm);
  }, [currentSearchTerm]);


  const getGdiGuideName = useCallback((member: Member): string => {
    if (!member.assignedGDIId) return "No asignado";
    const gdi = allGDIs.find(g => g.id === member.assignedGDIId);
    if (!gdi) return "GDI no encontrado";
    const guide = allMembersForDropdowns.find(m => m.id === gdi.guideId); 
    return guide ? `${guide.firstName} ${guide.lastName}` : "Guía no encontrado";
  }, [allGDIs, allMembersForDropdowns]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleSearchSubmit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); 
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  
  const processedMembers = useMemo(() => {
    let membersToProcess = [...members]; 

    membersToProcess.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'fullName') {
        valA = `${a.firstName} ${a.lastName}`;
        valB = `${b.firstName} ${b.lastName}`;
      } else {
        valA = a[sortKey as keyof Member];
        valB = b[sortKey as keyof Member];
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortKey === 'birthDate' || sortKey === 'churchJoinDate') {
          const dateA = valA ? new Date(valA as string).getTime() : 0;
          const dateB = valB ? new Date(valB as string).getTime() : 0;
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
    return membersToProcess;
  }, [members, sortKey, sortOrder]);

  const handleOpenDetailsDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedMember(null);
  };

  const handleAddSingleMemberSubmit = async (data: AddMemberFormValues) => {
    const newMemberWriteData: MemberWriteData = {
      ...data,
      birthDate: data.birthDate ? data.birthDate.toISOString().split('T')[0] : undefined,
      churchJoinDate: data.churchJoinDate ? data.churchJoinDate.toISOString().split('T')[0] : undefined,
      roles: [], 
    };

    startMemberTransition(async () => {
      const result = await addSingleMemberAction(newMemberWriteData);
      if (result.success && result.newMember) {
        toast({ title: "Éxito", description: result.message });
        setIsAddMemberDialogOpen(false);
        router.refresh(); 
      } else {
        toast({ title: "Error al Agregar", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleMemberUpdated = (updatedMember: Member) => {
    setMembers(prevMembers => 
      prevMembers.map(m => m.id === updatedMember.id ? updatedMember : m)
    );
    router.refresh(); 
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />;
  };

  const displayStatus = (status: Member['status']) => {
    switch (status) {
      case 'Active': return 'Activo';
      case 'Inactive': return 'Inactivo';
      case 'New': return 'Nuevo';
      default: return status;
    }
  };

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newSize);
    params.set('page', '1'); // Reset to first page when size changes
    router.push(`${pathname}?${params.toString()}`);
  };


  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }} className="relative flex-grow sm:flex-none sm:w-full md:w-1/2 lg:w-2/3 xl:w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar miembros (nombre, email, rol...)"
            className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-primary focus:border-primary"
            value={searchInput}
            onChange={handleSearchChange}
          />
          <button type="submit" className="hidden" />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsAddMemberDialogOpen(true)} disabled={isProcessingMember}>
            <UserPlus className="mr-2 h-4 w-4" /> Agregar Nuevo Miembro
          </Button>
          <Button asChild variant="outline" disabled={isProcessingMember}>
            <Link href="/members/bulk-add">
              <ListPlus className="mr-2 h-4 w-4" /> Agregar Múltiples Miembros
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto bg-card rounded-lg shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead onClick={() => handleSort('fullName')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Nombre Completo <SortIcon columnKey="fullName" />
                </div>
              </TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Guía GDI</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Estado <SortIcon columnKey="status" />
                </div>
              </TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedMembers.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Avatar>
                    <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait"/>
                    <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0,1)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>{getGdiGuideName(member)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.roles && member.roles.length > 0 ? (
                      member.roles.map(role => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {roleDisplayNames[role] || role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    member.status === 'Active' ? 'default' :
                    member.status === 'Inactive' ? 'secondary' :
                    'outline'
                  }
                  className={
                    member.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/50' :
                    member.status === 'Inactive' ? 'bg-red-500/20 text-red-700 border-red-500/50' :
                    'bg-yellow-500/20 text-yellow-700 border-yellow-500/50'
                  }
                  >
                    {displayStatus(member.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="icon" onClick={() => handleOpenDetailsDialog(member)} title="Ver Detalles" disabled={isProcessingMember}>
                    <Info className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {processedMembers.length === 0 && currentSearchTerm && (
        <p className="text-center text-muted-foreground mt-8">No se encontraron miembros con el término de búsqueda "{currentSearchTerm}".</p>
      )}
      {initialMembers.length === 0 && !currentSearchTerm && (
         <p className="text-center text-muted-foreground mt-8">No hay miembros para mostrar.</p>
      )}

    {totalPages > 0 && ( // Show pagination controls only if there are pages
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
            <span className="hidden sm:inline"> ({initialMembers.length > 0 ? ((currentPage -1) * pageSize) + 1 : 0}-{(Math.min(currentPage * pageSize, processedMembers.reduce((acc, _curr) => acc + 1, (currentPage - 1) * pageSize + (initialMembers.length > 0 ? initialMembers.length % pageSize === 0 ? pageSize : initialMembers.length % pageSize : 0 ) )))} de {processedMembers.reduce((acc, _curr) => acc + 1, (currentPage - 1) * pageSize + (initialMembers.length > 0 ? initialMembers.length % pageSize === 0 ? pageSize : initialMembers.length % pageSize : 0 ) - initialMembers.length + (totalPages*pageSize - (pageSize - (initialMembers.length % pageSize === 0 ? pageSize : initialMembers.length % pageSize))) )} total)</span>
            {/* The total count logic above is complex to get the total across all pages; consider simplifying if just total on current page is needed */}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                >
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                        <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(createPageURL(currentPage - 1))}
              disabled={currentPage <= 1 || isProcessingMember}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(createPageURL(currentPage + 1))}
              disabled={currentPage >= totalPages || isProcessingMember}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}


      {selectedMember && (
        <MemberDetailsDialog
          member={selectedMember}
          allMembers={allMembersForDropdowns} 
          allGDIs={allGDIs}
          allMinistryAreas={allMinistryAreas}
          allMeetings={allMeetings}
          allMeetingSeries={allMeetingSeries}
          allAttendanceRecords={allAttendanceRecords}
          isOpen={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
          onMemberUpdated={handleMemberUpdated}
          updateMemberAction={updateMemberAction}
        />
      )}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b sticky top-0 bg-background z-10">
            <DialogTitle>Agregar Nuevo Miembro</DialogTitle>
            <DialogDescription>
              Complete los detalles del nuevo miembro de la iglesia. Haga clic en "Agregar Miembro" cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto">
            <AddMemberForm
              onSubmitMember={handleAddSingleMemberSubmit}
              allGDIs={allGDIs}
              allMinistryAreas={allMinistryAreas}
              allMembers={allMembersForDropdowns} 
              submitButtonText="Agregar Miembro"
              cancelButtonText="Cancelar"
              onDialogClose={() => setIsAddMemberDialogOpen(false)}
              isSubmitting={isProcessingMember}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

